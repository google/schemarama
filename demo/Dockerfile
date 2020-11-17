FROM python:3.7
WORKDIR /home/scc

# Install manually all the missing libraries
RUN apt-get update
RUN apt-get install -y gconf-service libasound2 libatk1.0-0 libcairo2 libcups2 libfontconfig1 libgdk-pixbuf2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libxss1 fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

# Install Chrome
RUN wget http://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_86.0.4240.198-1_amd64.deb
RUN dpkg -i google-chrome-stable_86.0.4240.198-1_amd64.deb; apt-get -fy install

COPY . .
RUN pip install -r requirements.txt

ENV FLASK_APP app.py
ENV FLASK_RUN_PORT=5000
ENV FLASK_RUN_HOST='0.0.0.0'
EXPOSE 5000
ENTRYPOINT ["flask", "run"]
