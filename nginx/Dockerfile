FROM nginx:1.25-alpine

# Overwrite default configuration with our custom reverse proxy rules
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
