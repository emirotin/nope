from django.db import models

class ChatEntry(models.Model):
    timestamp = models.DateTimeField(auto_now=True)
    user_name = models.CharField(max_length=250)
    message = models.TextField()
    