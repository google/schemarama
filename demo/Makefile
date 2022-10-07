# update {index,shapes}.html from templates

index.html shapes.html: templates/scc.html templates/shapes.html
	rm index.html shapes.html
	python pickle-flask.py basic_app app -o . -ni

