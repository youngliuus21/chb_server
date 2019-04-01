docker run --name chb_server -e https_proxy=http://www-proxy-brmdc.us.oracle.com:80 -e http_proxy=http://www-proxy-brmdc.us.oracle.com:80 -e no_proxy=action_server  -e ACTION_SERVER=http://action_server:19999 -p 8080:18888 --net mynet -d chb:0.1

