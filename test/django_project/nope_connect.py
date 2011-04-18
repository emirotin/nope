import httplib, urllib
import json

class NopeConnect(object):
    def __init__(self, nope_host):
        self.host = nope_host.replace('http://', '')
        
    def push(self, type, body, channel, client_id='', push_password=''):
        conn = httplib.HTTPConnection(self.host)
        params = {'password': push_password,
                  'type': type,
                  'channel': channel,
                  'client_id': client_id,
                  'body': body}
        params = json.dumps(params)
        headers = {"Content-type": "application/json",
                   "Accept": "text/plain"}
        
        conn.request("POST", "/push", params, headers)
        response = conn.getresponse()
        conn.close()
        return response.status == 200
        

