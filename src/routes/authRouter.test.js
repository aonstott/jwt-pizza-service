const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;
let userId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  userId = registerRes.body.user.id;
  console.log(registerRes.body);
  expectValidJwt(testUserAuthToken);
});

afterAll(async () => {
  await request(app)
    .delete(`/api/auth`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("login nothing", async () => {
  const loginRes = await request(app).put("/api/auth").send();
  expect(loginRes.status).toBe(500);
});

test("login no password", async () => {
  const loginRes = await request(app)
    .put("/api/auth")
    .send({ name: "pizza man", email: "no@a.com" });
  expect(loginRes.status).toBe(404);
});

test("register test", async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const regRes = await request(app).post("/api/auth").send(testUser);
  expect(regRes.status).toBe(200);
  expectValidJwt(regRes.body.token);
  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(regRes.body.user).toMatchObject(expectedUser);
});

test("update user", async () => {
  const newUser = {
    email: Math.random().toString(36).substring(2, 12) + "@test.com",
    password: "ilovemydog",
  };
  console.log(userId);
  const updateRes = await request(app)
    .put(`/api/auth/${userId}`)
    .send(newUser)
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  const expectedUser = { ...newUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;

  expect(updateRes.body).toMatchObject(expectedUser);
});

test("logout test", async () => {
  const logoutRes = await request(app)
    .delete(`/api/auth`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toMatchObject({ message: "logout successful" });
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}
