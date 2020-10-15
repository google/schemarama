FROM python:3.6-alpine
WORKDIR /home/scc
COPY . .
RUN pip install -r requirements.txt

ENV FLASK_APP app.py
ENV FLASK_RUN_PORT=5000
ENV FLASK_RUN_HOST='0.0.0.0'
EXPOSE 5000
ENTRYPOINT ["flask", "run"]
