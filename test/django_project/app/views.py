from django.conf import settings
from django.shortcuts import render_to_response
from django.http import HttpResponseNotAllowed, HttpResponse

from models import ChatEntry

from django_project.nope_connect import NopeConnect


def home(request):    
    return render_to_response('django_project/index.html', {'NOPE_HOST': settings.NOPE_HOST})


connector = NopeConnect(settings.NOPE_HOST)
def send_message(request):
    if request.method != 'POST' or not request.is_ajax():
        return HttpResponseNotAllowed()
    
    user_name = request.POST['user_name']
    message = request.POST['text']
    
    ce = ChatEntry(user_name=user_name, message=message)
    ce.save()
    
    connector.push('msg', {'text': message}, 'chat', user_name, settings.NOPE_PASSWORD)
    
    return HttpResponse()