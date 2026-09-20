.PHONY: dev test install seed clean

dev:
	@bash scripts/dev.sh

test:
	@cd backend && PYTHONPATH=. ./venv/bin/pytest tests -v || python -m pytest tests -v

install:
	@cd backend && python -m venv venv && ./venv/bin/pip install -r requirements.txt
	@cd frontend && npm install

seed:
	@cd backend && PYTHONPATH=. ./venv/bin/python -c "from app.db import init_db; init_db()"

clean:
	@rm -rf backend/app/data/*.db backend/.pytest_cache frontend/.next
