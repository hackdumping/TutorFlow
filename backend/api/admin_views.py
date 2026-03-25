from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Q, Count
from django.utils import timezone
from django.http import HttpResponse
import csv
from .models import User, Booking, Transaction, Wallet
from .serializers import BookingSerializer, TransactionSerializer, UserSerializer

class AdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Platform Commission
        fees_transactions = Transaction.objects.filter(transaction_type='platform_fee')
        total_commission = fees_transactions.aggregate(Sum('amount'))['amount__sum'] or 0

        # 2. Total in circulation (Wallets + Escrows)
        wallets = Wallet.objects.aggregate(Sum('balance'), Sum('escrow_balance'))
        total_balance = wallets['balance__sum'] or 0
        total_escrow = wallets['escrow_balance__sum'] or 0
        total_circulation = total_balance + total_escrow

        # 3. User counts
        total_users = User.objects.count()
        students_count = User.objects.filter(role='student').count()
        teachers_count = User.objects.filter(role='teacher').count()
        new_users_today = User.objects.filter(date_joined__gte=today).count()

        # 4. Booking stats
        total_bookings = Booking.objects.count()
        completed_bookings = Booking.objects.filter(status='completed').count()
        success_rate = (completed_bookings / total_bookings * 100) if total_bookings > 0 else 0

        # 5. Deposits vs Withdrawals
        total_deposits = Transaction.objects.filter(transaction_type='deposit', status='completed').aggregate(Sum('amount'))['amount__sum'] or 0
        total_withdrawals = abs(Transaction.objects.filter(transaction_type='withdrawal', status='completed').aggregate(Sum('amount'))['amount__sum'] or 0)

        return Response({
            'total_commission': total_commission,
            'total_circulation': total_circulation,
            'total_balance': total_balance,
            'total_escrow': total_escrow,
            'total_users': total_users,
            'students_count': students_count,
            'teachers_count': teachers_count,
            'new_users_today': new_users_today,
            'total_bookings': total_bookings,
            'completed_bookings': completed_bookings,
            'success_rate': round(success_rate, 1),
            'total_deposits': total_deposits,
            'total_withdrawals': total_withdrawals
        })

    @action(detail=False, methods=['get'])
    def list_users(self, request):
        role = request.query_params.get('role')
        users = User.objects.all()
        if role:
            users = users.filter(role=role)
        
        users = users.order_by('-date_joined')
        return Response(UserSerializer(users, many=True).data)

    @action(detail=False, methods=['get'])
    def export_users_csv(self, request):
        role = request.query_params.get('role')
        users = User.objects.all()
        if role:
            users = users.filter(role=role)
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="users_{role or "all"}_{timezone.now().date()}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Pseudo', 'Email', 'Prénom', 'Nom', 'Rôle', 'Pays', 'Ville', 'Date Inscription'])
        
        for u in users:
            writer.writerow([u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.country, u.city, u.date_joined])
            
        return response

    @action(detail=False, methods=['get'])
    def global_transactions(self, request):
        limit = int(request.query_params.get('limit', 50))
        txs = Transaction.objects.all().select_related('user').order_by('-created_at')[:limit]
        return Response(TransactionSerializer(txs, many=True).data)

    @action(detail=False, methods=['get'])
    def global_bookings(self, request):
        limit = int(request.query_params.get('limit', 50))
        bookings = Booking.objects.all().select_related('student', 'teacher__user', 'subject').order_by('-created_at')[:limit]
        return Response(BookingSerializer(bookings, many=True).data)

    @action(detail=False, methods=['post'])
    def create_admin(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        username = request.data.get('username')

        if not email or not password or not username:
            return Response({'error': "L'email, le pseudo et le mot de passe sont requis."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists() or User.objects.filter(username=username).exists():
            return Response({'error': 'Cet email ou pseudo est déjà pris.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin'
        )

        return Response({'message': 'Administrateur créé avec succès', 'id': user.id})
