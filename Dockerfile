# 1. 노드 이미지
FROM node:20-alpine

# 2. 작업 디렉토리 /app으로 설정
WORKDIR /app

# 3. 패키지 파일 복제
COPY package.json package-lock.json ./

# 4. npm 설치
RUN npm install

# 5. 현재 디렉토리에 있는 파일 모두 복제 
COPY . .

# 6. 애플리케이션이 사용할 포트
EXPOSE 3000

# 7. npm start로 앱을 시작
CMD ["node", "app.js"]
