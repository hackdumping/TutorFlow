from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    TeacherProfileViewSet, BookingViewSet, MessageViewSet, 
    UserViewSet, SubjectViewSet, LevelViewSet, ReviewViewSet, GroupChatViewSet,
    NotificationViewSet
)
from .registration_view import register_user, request_password_reset

router = DefaultRouter()
router.register(r'teachers', TeacherProfileViewSet)
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'groups', GroupChatViewSet, basename='group')
router.register(r'users', UserViewSet, basename='user')
router.register(r'subjects', SubjectViewSet)
router.register(r'levels', LevelViewSet)
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', register_user, name='register_user'),
    path('auth/request-password-reset/', request_password_reset, name='request_password_reset'),
]
