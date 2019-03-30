docker run --name chb_server -e https_proxy=http://www-proxy-brmdc.us.oracle.com:80 -e http_proxy=http://www-proxy-brmdc.us.oracle.com:80 -e action_server=http://action_server:9999 -p 8080:18888 -d chb_server:0.1

