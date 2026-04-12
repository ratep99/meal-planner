FROM maven:3.9-eclipse-temurin-17

WORKDIR /app

COPY pom.xml mvnw mvnw.cmd ./
COPY .mvn .mvn

RUN chmod +x mvnw \
  && ./mvnw dependency:go-offline -B || true

EXPOSE 8080

CMD ["./mvnw", "spring-boot:run"]
