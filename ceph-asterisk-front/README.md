git clone

cd .\ceph-asterisk-front\frontend\

rename .env.example to .env

enter your backend server address in VITE_API_BASE_URL

set VITE_USE_MOCK=false

npm i

npm audit fix

npm run dev
