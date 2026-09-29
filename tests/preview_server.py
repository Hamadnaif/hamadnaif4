"""Disposable UI acceptance server: in-memory database only. Never use for deployment."""
import os
import sys
from pathlib import Path
os.environ['MONGO_URL']='mongodb://127.0.0.1:27017'
os.environ['DB_NAME']='ui_test_only'
os.environ['JWT_SECRET']='isolated-local-ui-testing-secret-32-bytes'
for key in ('ADMIN_EMAIL','ADMIN_PASSWORD','TAP_COMMERCE_ENABLED','TAP_PAYOUTS_ENABLED','EMERGENT_EMAIL_KEY','EMERGENT_LLM_KEY'):
    os.environ.pop(key,None)
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from mongomock_motor import AsyncMongoMockClient
import db
# Replace before any application modules import db. No production Mongo connection is made.
db.db=AsyncMongoMockClient()['test']
from server import app
from fastapi.responses import FileResponse, JSONResponse
build=Path(__file__).resolve().parents[1]/'frontend'/'build'

@app.get('/{path:path}')
async def frontend(path:str):
    if path.startswith('api/'):
        return JSONResponse({'detail':'Not found'},status_code=404)
    target=(build/path).resolve()
    if not target.is_relative_to(build.resolve()):
        return JSONResponse({'detail':'Not found'},status_code=404)
    return FileResponse(target if target.is_file() else build/'index.html')
