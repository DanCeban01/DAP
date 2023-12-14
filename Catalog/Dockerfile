FROM python:3.10

WORKDIR /app

ADD requirements.txt /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Add the current directory contents into the container at /app
ADD . /app

EXPOSE 3030

CMD [ "python3", "product_catalog.py"]