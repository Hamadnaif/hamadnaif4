# Auth Testing Playbook (Manasati)

Two auth methods coexist:
1. JWT email/password (cookies access_token + refresh_token, or Bearer)
2. Emergent Google login (cookie session_token, stored in user_sessions collection)

## Admin
Email: hamad6668@gmail.com  Password: [REDACTED — supply test credentials through environment variables]  Role: admin

## API quick test
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"hamad6668@gmail.com","password":"[REDACTED — supply test credentials through environment variables]"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
curl -b cookies.txt http://localhost:8001/api/admin/stats
```

## Emergent Google session test (browser)
Insert a user + user_sessions doc, set cookie session_token, then hit /api/auth/me.
```
mongosh --eval "
use('test_database');
var uid = db.users.insertOne({email:'g.test@example.com',name:'G Test',role:'customer',auth_provider:'google',account_status:'active',created_at:new Date().toISOString()}).insertedId;
db.user_sessions.insertOne({user_id:uid.toString(),session_token:'test_session_123',expires_at:new Date(Date.now()+7*24*3600*1000).toISOString(),created_at:new Date().toISOString()});
"
curl http://localhost:8001/api/auth/me -H "Authorization: Bearer test_session_123"
```

## RBAC
- Customer cannot access /api/admin/* (expect 403).
- Customer cannot read another user's site (expect 403/404 on /api/sites/{id}).

## Checklist
- bcrypt hash starts with $2b$
- users.email unique index exists
- /api/auth/me returns role
- suspended account -> 403
