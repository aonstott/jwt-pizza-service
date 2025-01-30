const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

let franchiseToken;

beforeAll(async () => {
  const loginRes = await request(app)
    .put(`/api/auth`)
    .send({ email: "a@jwt.com", password: "admin" });
  //console.log(loginRes.body);
  franchiseToken = loginRes.body.token;
  await new Promise((resolve) => setTimeout(resolve, 500));
});

afterAll(async () => {
  const logoutRes = await request(app)
    .delete(`/api/auth`)
    .set("Authorization", `Bearer ${franchiseToken}`);
});

test("list franchises", async () => {
  const listRes = await request(app).get("/api/franchise");
  expect(listRes.status).toBe(200);
  //console.log(listRes.body);
});

test("create franchise", async () => {
  const listRes = await request(app)
    .post(`/api/franchise`)
    .send(generateFranchise())
    .set("Authorization", `Bearer ${franchiseToken}`);
  // console.log(listRes.body);

  expect(listRes.status).toBe(200);
});

test("list user franchises", async () => {
  const listRes = await request(app)
    .get(`/api/franchise/1`)
    .set("Authorization", `Bearer ${franchiseToken}`);
  //console.log(listRes.body);
  expect(listRes.status).toBe(200);
});

test("delete franchise", async () => {
  const createRes = await request(app)
    .post(`/api/franchise`)
    .send(generateFranchise())
    .set("Authorization", `Bearer ${franchiseToken}`);

  expect(createRes.status).toBe(200);
  //console.log(createRes.body);
  const fId = createRes.body.id;

  //console.log(`fid is: ${fId}`);

  const deleteRes = await request(app)
    .delete(`/api/franchise/${fId}`)
    .set("Authorization", `Bearer ${franchiseToken}`);

  expect(deleteRes.status).toBe(200);
});

test("create and delete a store", async () => {
  const createRes = await request(app)
    .post(`/api/franchise`)
    .send(generateFranchise())
    .set("Authorization", `Bearer ${franchiseToken}`);

  expect(createRes.status).toBe(200);
  //console.log(createRes.body);
  const fId = createRes.body.id;

  const storeRes = await request(app)
    .post(`/api/franchise/${fId}/store`)
    .send({ franchiseId: fId, name: "somalia" })
    .set("Authorization", `Bearer ${franchiseToken}`);

  expect(storeRes.status).toBe(200);

  const storeId = storeRes.body.id;

  const deleteRes = await request(app)
    .delete(`/api/franchise/${fId}/store/${storeId}`)
    .set("Authorization", `Bearer ${franchiseToken}`);
  expect(deleteRes.status).toBe(200);
});

function generateFranchise() {
  return {
    name: Math.random().toString(36).substring(2, 12),
    admins: [{ email: "a@jwt.com" }],
  };
}
