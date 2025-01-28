const request = require("supertest");
const app = require("../service");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  userId = registerRes.body.user.id;
});

test("list franchises", async () => {
  const listRes = await request(app).get("/api/franchise");
  expect(listRes.status).toBe(200);
  console.log(listRes.body);
});

test("list user franchises", async () => {
  const listRes = await request(app)
    .get(`/api/franchise/1`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  console.log(listRes.body);
  expect(listRes.status).toBe(200);
});
