from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .serializers import (
    UserSerializer, TeacherProfileSerializer, SubjectSerializer,
    LevelSerializer, BookingSerializer, MessageSerializer, ReviewSerializer,
    GroupChatSerializer, NotificationSerializer
)
from .models import User, Subject, Level, TeacherProfile, Booking, Review, Message, GroupChat, Notification, GroupReadReceipt


class IsAdminOrSelf(permissions.BasePermission):
    """Allow access only to admin users or the user themselves."""
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or obj == request.user


from django_filters import rest_framework as dj_filters

class TeacherProfileFilter(dj_filters.FilterSet):
    min_rate = dj_filters.NumberFilter(field_name="hourly_rate", lookup_expr='gte')
    max_rate = dj_filters.NumberFilter(field_name="hourly_rate", lookup_expr='lte')
    subject = dj_filters.NumberFilter(field_name="subjects__id")
    level = dj_filters.NumberFilter(field_name="levels__id")
    country = dj_filters.CharFilter(field_name="user__country", lookup_expr='icontains')
    city = dj_filters.CharFilter(field_name="user__city", lookup_expr='icontains')

    class Meta:
        model = TeacherProfile
        fields = ['is_certified', 'subject', 'level', 'min_rate', 'max_rate', 'country', 'city']

class TeacherProfileViewSet(viewsets.ModelViewSet):
    """Access to teacher profiles. Read for all, update for the teacher themselves."""
    queryset = TeacherProfile.objects.select_related('user').prefetch_related('subjects', 'levels').all()
    serializer_class = TeacherProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TeacherProfileFilter
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_update(self, serializer):
        # Ensure only the owner can update
        profile = self.get_object()
        if profile.user != self.request.user:
            raise permissions.PermissionDenied("You cannot update another teacher's profile.")
        serializer.save()

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Retrieve the profile of the currently authenticated teacher."""
        profile = TeacherProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({'error': 'Teacher profile not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    search_fields = ['user__first_name', 'user__last_name', 'bio']
    ordering_fields = ['hourly_rate', 'rating']


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return Booking.objects.filter(teacher__user=user).select_related(
                'student', 'teacher__user', 'subject'
            ).order_by('-created_at')
        return Booking.objects.filter(student=user).select_related(
            'student', 'teacher__user', 'subject'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
            # Teachers must provide a student object in the request
            # The serializer usually expects a PK for 'student' field
            booking = serializer.save(teacher=user.teacher_profile)
        else:
            # Students are request.user
            booking = serializer.save(student=user)
            
        # Create notification for the OTHER party
        if user.role == 'teacher':
            Notification.objects.create(
                user=booking.student,
                type='new_booking',
                title="Nouvelle Séance Programmée",
                content=f"Dr. {user.last_name} a programmé une nouvelle séance de {booking.subject.name} pour vous.",
                related_id=booking.id
            )
        else:
            Notification.objects.create(
                user=booking.teacher.user,
                type='new_booking',
                title="Nouveau Cours Demandé",
                content=f"{booking.student.first_name} souhaite réserver un cours de {booking.subject.name}.",
                related_id=booking.id
            )

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        """Allow teacher to confirm or cancel a booking."""
        booking = self.get_object()
        if request.user.role != 'teacher' or booking.teacher.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get('status')
        if new_status not in ['confirmed', 'cancelled', 'completed']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = new_status
        booking.save()

        # Create notification for student
        if new_status == 'confirmed':
            Notification.objects.create(
                user=booking.student,
                type='booking_confirmed',
                title="Cours Confirmé !",
                content=f"Votre cours de {booking.subject.name} avec {booking.teacher.user.first_name} est confirmé.",
                related_id=booking.id
            )
        elif new_status == 'cancelled':
            Notification.objects.create(
                user=booking.student,
                type='booking_cancelled',
                title="Cours Annulé",
                content=f"Votre cours de {booking.subject.name} avec {booking.teacher.user.first_name} a été annulé.",
                related_id=booking.id
            )

        return Response(BookingSerializer(booking).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAdminUser()]
        # chat_contacts and other custom actions allow any authenticated user
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get', 'patch', 'put', 'delete'], url_path='me')
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == 'DELETE':
            request.user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['patch'], url_path='presence')
    def presence(self, request):
        """Update user online/offline status."""
        from django.utils import timezone
        is_online = request.data.get('is_online', False)
        request.user.is_online = is_online
        if not is_online:
            request.user.last_seen = timezone.now()
        request.user.save(update_fields=['is_online', 'last_seen'])
        return Response({'is_online': request.user.is_online, 'last_seen': request.user.last_seen})

    @action(detail=False, methods=['get'], url_path='chat-contacts', permission_classes=[permissions.IsAuthenticated])
    def chat_contacts(self, request):
        """Return all users excluding the current user so they can start new chats."""
        users = User.objects.exclude(id=request.user.id).order_by('first_name', 'last_name')
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)



class GroupChatViewSet(viewsets.ModelViewSet):
    serializer_class = GroupChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GroupChat.objects.filter(members=self.request.user)

    def perform_create(self, serializer):
        group = serializer.save(admin=self.request.user)
        group.members.add(self.request.user)

    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        group = self.get_object()
        if group.admin != request.user:
            return Response({'error': 'Only admin can add members'}, status=status.HTTP_403_FORBIDDEN)
        user_ids = request.data.get('user_ids', [])
        users = User.objects.filter(id__in=user_ids)
        group.members.add(*users)
        return Response(GroupChatSerializer(group).data)

    @action(detail=True, methods=['post'])
    def remove_members(self, request, pk=None):
        group = self.get_object()
        if group.admin != request.user:
            return Response({'error': 'Only admin can remove members'}, status=status.HTTP_403_FORBIDDEN)
        user_ids = request.data.get('user_ids', [])
        # Admin should not be able to remove themselves via this endpoint (use leave_group)
        users = User.objects.filter(id__in=user_ids).exclude(id=request.user.id)
        group.members.remove(*users)
        return Response(GroupChatSerializer(group).data)

    @action(detail=True, methods=['post'])
    def leave_group(self, request, pk=None):
        group = self.get_object()
        if request.user == group.admin:
            # WhatsApp logic: if admin leaves, the group is either deleted OR a new admin is assigned.
            # Simple approach for now: deleting if admin leaves.
            group.delete()
            return Response({'status': 'Group deleted as admin left'}, status=status.HTTP_204_NO_CONTENT)
        group.members.remove(request.user)
        return Response({'status': 'Left group'})

    def destroy(self, request, *args, **kwargs):
        group = self.get_object()
        if group.admin != request.user:
            return Response({'error': 'Only admin can delete the group'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Message.objects.filter(
            models.Q(sender=user) | 
            models.Q(receiver=user) | 
            models.Q(group__members=user)
        ).distinct()
        
        # Filter by conversation partner or group
        with_user = self.request.query_params.get('conversation_with')
        with_group = self.request.query_params.get('group')
        
        if with_user:
            qs = qs.filter(
                models.Q(sender=user, receiver_id=with_user) |
                models.Q(sender_id=with_user, receiver=user)
            )
        elif with_group:
            qs = qs.filter(group_id=with_group)
            
        return qs.select_related('sender', 'receiver', 'group').order_by('timestamp')

    def perform_create(self, serializer):
        # Security: always force sender to the authenticated user
        message = serializer.save(sender=self.request.user)

        # Create notification for receiver(s)
        if message.receiver:
            Notification.objects.create(
                user=message.receiver,
                type='message',
                title=f"Message de {message.sender.first_name}",
                content="[Sticker]" if message.is_sticker else (message.content[:100] + ('...' if len(message.content) > 100 else '')),
                related_id=message.sender.id
            )
        elif message.group:
            for member in message.group.members.exclude(id=self.request.user.id):
                Notification.objects.create(
                    user=member,
                    type='message',
                    title=f"Group {message.group.name}",
                    content=f"{message.sender.first_name}: " + ("[Sticker]" if message.is_sticker else (message.content[:100] + ('...' if len(message.content) > 100 else ''))),
                    related_id=message.group.id
                )

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a message as read. Only the receiver can do this."""
        message = self.get_object()
        if message.receiver == request.user or (message.group and request.user in message.group.members.all()):
            message.is_read = True
            message.save()
            return Response(MessageSerializer(message).data)
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=False, methods=['patch'])
    def mark_conversation_read(self, request):
        """Mark all messages from a partner or group as read."""
        user = request.user
        partner_id = request.data.get('partner_id')
        group_id = request.data.get('group_id')

        if partner_id:
            Message.objects.filter(
                receiver=user,
                sender_id=partner_id,
                is_read=False
            ).update(is_read=True)
        elif group_id:
            # Mark messages in that group as read for the user context using GroupReadReceipt
            unread_messages = Message.objects.filter(
                group_id=group_id
            ).exclude(sender=user).exclude(read_receipts__user=user)
            
            receipts = [
                GroupReadReceipt(message=msg, user=user, group_id=group_id)
                for msg in unread_messages
            ]
            GroupReadReceipt.objects.bulk_create(receipts, ignore_conflicts=True)
        
        return Response({'status': 'Conversation marked as read'})

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Return a list of unique conversation partners and groups with last message."""
        user = request.user
        messages = Message.objects.filter(
            models.Q(sender=user) | 
            models.Q(receiver=user) | 
            models.Q(group__members=user)
        ).select_related('sender', 'receiver', 'group').order_by('-timestamp')
        
        seen = {}
        for msg in messages:
            if msg.group:
                key = f"group_{msg.group.id}"
                if key not in seen:
                    # WhatsApp style unread logic for groups:
                    # Any message in the group NOT sent by the user AND NOT in user's GroupReadReceipt
                    unread_count = Message.objects.filter(
                        group=msg.group
                    ).exclude(sender=user).exclude(read_receipts__user=user).count()
                    
                    seen[key] = {
                        'is_group': True,
                        'group': GroupChatSerializer(msg.group).data,
                        'last_message': msg.content or ('Sticker' if msg.is_sticker else ('Attachment' if msg.file_attachment else '')),
                        'last_time': msg.timestamp,
                        'unread_count': unread_count, 
                    }
            else:
                partner = msg.receiver if msg.sender == user else msg.sender
                if partner and partner.id:
                    key = f"user_{partner.id}"
                    if key not in seen:
                        unread_count = Message.objects.filter(sender=partner, receiver=user, is_read=False).count()
                        seen[key] = {
                            'is_group': False,
                            'partner': UserSerializer(partner).data,
                            'last_message': msg.content or ('Attachment' if msg.file_attachment else ''),
                            'last_time': msg.timestamp,
                            'unread_count': unread_count,
                        }
        return Response(list(seen.values()))

    @action(detail=False, methods=['delete'])
    def delete_conversation(self, request):
        """Delete all messages with a user or in a group for the current user."""
        user = request.user
        partner_id = request.query_params.get('conversation_with')
        group_id = request.query_params.get('group')

        if partner_id:
            Message.objects.filter(
                (models.Q(sender=user, receiver_id=partner_id) | 
                 models.Q(sender_id=partner_id, receiver=user))
            ).delete()
        elif group_id:
            # Simple approach: delete for everyone in the group if any member deletes? 
            # Better: a soft-delete per user, but let's keep it simple as TutorFlow is small.
            Message.objects.filter(group_id=group_id).delete()
        else:
            return Response({'error': 'Specify conversation_with or group'}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer


class LevelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Level.objects.all()
    serializer_class = LevelSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(booking__student=self.request.user)

    def perform_create(self, serializer):
        booking = serializer.validated_data.get('booking')
        if booking.student != self.request.user:
            raise permissions.PermissionDenied("You can only review your own bookings.")
        serializer.save()

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})
    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        Notification.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
