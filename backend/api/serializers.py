from rest_framework import serializers
from .models import User, Subject, Level, TeacherProfile, Booking, Review, Message, GroupChat, Notification

# Redundant UserSerializer removed

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'

class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = '__all__'

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'profile_picture', 'city', 'country', 'gender')

class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    subjects_details = SubjectSerializer(source='subjects', many=True, read_only=True)
    levels_details = LevelSerializer(source='levels', many=True, read_only=True)
    
    class Meta:
        model = TeacherProfile
        fields = ('id', 'user', 'academic_title', 'bio', 'experience_years', 'subjects', 'levels', 'hourly_rate', 'is_certified', 'rating', 'accepts_online', 'accepts_in_person', 'subjects_details', 'levels_details')

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Use details for representation to return nested objects
        representation['subjects'] = representation.pop('subjects_details')
        representation['levels'] = representation.pop('levels_details')
        return representation

class UserSerializer(serializers.ModelSerializer):
    teacher_profile = TeacherProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'gender',
                  'city', 'country', 'phone_number', 'profile_picture', 'is_online', 'last_seen', 'teacher_profile')
        read_only_fields = ('id', 'username', 'role', 'is_online', 'last_seen')

    def to_internal_value(self, data):
        # Custom logic to handle nested teacher_profile from FormData
        # FormData sends nested fields like teacher_profile[bio]
        if hasattr(data, 'getlist'): # It's a QueryDict
            new_data = data.copy()
            teacher_profile = {}
            for key in data.keys():
                if key.startswith('teacher_profile['):
                    inner_key = key[key.find("[")+1:key.find("]")]
                    values = data.getlist(key)
                    teacher_profile[inner_key] = values if len(values) > 1 else values[0]
                    if key in new_data:
                        del new_data[key]
            
            if teacher_profile:
                # If teacher_profile already exists as a dict in data (unlikely with FormData), merge it
                existing = new_data.get('teacher_profile', {})
                if isinstance(existing, dict):
                    existing.update(teacher_profile)
                    new_data['teacher_profile'] = existing
                else:
                    new_data['teacher_profile'] = teacher_profile
            data = new_data
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        teacher_profile_data = validated_data.pop('teacher_profile', None)
        instance = super().update(instance, validated_data)
        
        if teacher_profile_data and instance.role == 'teacher':
            profile, created = TeacherProfile.objects.get_or_create(user=instance)
            subjects = teacher_profile_data.pop('subjects', None)
            levels = teacher_profile_data.pop('levels', None)
            
            for attr, value in teacher_profile_data.items():
                if hasattr(profile, attr):
                    setattr(profile, attr, value)
            profile.save()
            
            if subjects is not None:
                profile.subjects.set(subjects)
            if levels is not None:
                profile.levels.set(levels)
                
        return instance

class BookingSerializer(serializers.ModelSerializer):
    teacher_details = TeacherProfileSerializer(source='teacher', read_only=True)
    subject_details = SubjectSerializer(source='subject', read_only=True)
    student_details = UserSerializer(source='student', read_only=True)
    
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('meeting_link', 'meeting_room_id', 'created_at')

    def validate_student(self, value):
        # Allow student to be null during creation if teacher is creating
        return value

class GroupChatSerializer(serializers.ModelSerializer):
    admin_details = UserSerializer(source='admin', read_only=True)
    members_details = UserSerializer(source='members', many=True, read_only=True)

    class Meta:
        model = GroupChat
        fields = '__all__'
        read_only_fields = ('admin', 'created_at')

class MessageSerializer(serializers.ModelSerializer):
    sender_details = UserSerializer(source='sender', read_only=True)
    receiver_details = UserSerializer(source='receiver', read_only=True)
    group_details = GroupChatSerializer(source='group', read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ('sender', 'timestamp')

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.is_read
        
        if obj.group:
            # In groups, is_read means "I have read it"
            if obj.sender == request.user:
                return True
            return obj.read_receipts.filter(user=request.user).exists()
        
        return obj.is_read

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('created_at',)

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('created_at',)
