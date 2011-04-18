from django.conf.urls.defaults import patterns, include, url

urlpatterns = patterns('',
    url(r'^$', 'django_project.app.views.home'),
    url(r'^send_message', 'django_project.app.views.send_message'),
)
