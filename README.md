To run the application, npm install must be run in both the frontend and backend folder. Then type npm run dev in both directory terminal to start the app.

Both directory require environemnt variable(.env) file to run properly:

frontend:
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000

backend:
MONGO_URI=mongodb+srv://lokyungchan_db_user:UJJDBfUjapiepXEx@studyhub-cluster.au8rsv5.mongodb.net/?appName=studyhub-cluster
PORT=3000
NAGER_API_BASE=https://date.nager.at/api/v3
OPENAI_API_KEY=

