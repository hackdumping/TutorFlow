from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    if 'email' not in data or 'password' not in data or 'first_name' not in data or 'last_name' not in data:
        return Response({'detail': 'Veuillez remplir tous les champs obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if User.objects.filter(email=data['email']).exists():
            return Response({'detail': 'Un utilisateur avec cet email existe déjà.'}, status=status.HTTP_400_BAD_REQUEST)
            
        username = data.get('username', data['email'])
        if User.objects.filter(username=username).exists():
            username = data['email'].split('@')[0] + "_" + str(User.objects.count())

        user = User.objects.create_user(
            username=username,
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=data.get('role', 'student'),
            gender=data.get('gender', 'M')
        )
        
        if user.role == 'teacher':
             from .models import TeacherProfile
             # Default title based on gender
             title = 'Mme' if user.gender == 'F' else 'Mr'
             TeacherProfile.objects.create(user=user, academic_title=title)

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get('email')
    if not email:
        return Response({'detail': 'L\'adresse email est requise.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email=email).first()
        
        if user:
            # Simulate sending email for the demo. 
            # In production, we would use default_token_generator and send an email with the link.
            # print(f"Password reset link sent to {email}")
            pass
            
        # Always return success to prevent email enumeration
        return Response({'detail': 'Si cette adresse email existe, un lien de réinitialisation a été envoyé.'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
