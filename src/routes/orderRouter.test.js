const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

let token2;

beforeAll(async () => {
  const loginRes = await request(app)
    .put(`/api/auth`)
    .send({ email: "a@jwt.com", password: "admin" });
  //console.log(loginRes.body);
  token2 = loginRes.body.token;
});

test("add menu item", async () => {
  const addRes = await request(app)
    .put("/api/order/menu")
    .send({
      title: Math.random().toString(36).substring(2, 12),
      description:
        Math.random().toString(36).substring(2, 12) + "this is the description",
      image: Math.random().toString(36).substring(2, 12) + ".fortnite",
      price: 100 - Math.random() * 50,
    })
    .set("Authorization", `Bearer ${token2}`);
  expect(addRes.status).toBe(200);
});

test("get order menu", async () => {
  const listRes = await request(app).get("/api/order/menu");
  expect(listRes.status).toBe(200);
  console.log(listRes.body);
});
