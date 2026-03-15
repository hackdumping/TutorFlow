from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

class User(AbstractUser):
    IS_TEACHER = 'teacher'
    IS_STUDENT = 'student'
    ROLE_CHOICES = [
        (IS_TEACHER, 'Teacher'),
        (IS_STUDENT, 'Student'),
    ]
    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=IS_STUDENT)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='M')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)


class Subject(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Level(models.Model):
    name = models.CharField(max_length=50)
    
    def __str__(self):
        return self.name

class TeacherProfile(models.Model):
    TITLE_CHOICES = [
        ('Mr', 'Monsieur'),
        ('Mme', 'Madame'),
        ('Dr', 'Docteur'),
        ('Pr', 'Professeur'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    academic_title = models.CharField(max_length=10, choices=TITLE_CHOICES, default='Mr')
    bio = models.TextField(blank=True, default="")
    experience_years = models.PositiveIntegerField(default=0)
    subjects = models.ManyToManyField(Subject)
    levels = models.ManyToManyField(Level)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    is_certified = models.BooleanField(default=False)
    rating = models.FloatField(default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(5.0)])
    accepts_online = models.BooleanField(default=True)
    accepts_in_person = models.BooleanField(default=True)

class Booking(models.Model):
    COURSE_TYPE_CHOICES = [
        ('online', 'En ligne'),
        ('in_person', 'Présentiel'),
    ]
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmé'),
        ('cancelled', 'Annulé'),
        ('completed', 'Terminé'),
    ]
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_bookings')
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='teacher_bookings')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    duration_hours = models.FloatField(default=1.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    course_type = models.CharField(max_length=20, choices=COURSE_TYPE_CHOICES, default='in_person')
    meeting_link = models.URLField(blank=True, null=True)
    meeting_room_id = models.UUIDField(default=uuid.uuid4, editable=False)
    location_note = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    payment_status = models.CharField(max_length=20, default='unpaid')

    def save(self, *args, **kwargs):
        if self.course_type == 'online' and not self.meeting_link:
            self.meeting_link = f"https://meet.jit.si/tutorflow-{self.meeting_room_id}"
        super().save(*args, **kwargs)

class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class GroupChat(models.Model):
    name = models.CharField(max_length=255)
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='administered_groups')
    members = models.ManyToManyField(User, related_name='chat_groups')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages', null=True, blank=True)
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='messages', null=True, blank=True)
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    content = models.TextField(blank=True)
    file_attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    sticker_url = models.URLField(null=True, blank=True)
    is_sticker = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

class GroupReadReceipt(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='read_receipts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_read_receipts')
    group = models.ForeignKey(GroupChat, on_delete=models.CASCADE, related_name='read_receipts')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user')


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('message', 'Nouveau Message'),
        ('booking_confirmed', 'Cours Confirmé'),
        ('booking_cancelled', 'Cours Annulé'),
        ('new_booking', 'Nouveau Cours'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    content = models.TextField()
    related_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
