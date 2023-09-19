run_with_docker:
	docker run -it -p 8000:8000 -v `pwd`:/docs squidfunk/mkdocs-material
build_with_docker:
	docker run -v `pwd`:/docs squidfunk/mkdocs-material build
