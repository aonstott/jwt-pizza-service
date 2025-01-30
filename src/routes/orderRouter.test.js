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

afterAll(async () => {
  const logoutRes = await request(app)
    .delete(`/api/auth`)
    .set("Authorization", `Bearer ${token2}`);
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
  //console.log(listRes.body);
});

test("post order", async () => {
  const addMenuItemRes = await request(app)
    .put("/api/order/menu")
    .send({
      title: Math.random().toString(36).substring(2, 12),
      description:
        Math.random().toString(36).substring(2, 12) + "this is the description",
      image: Math.random().toString(36).substring(2, 12) + ".fortnite",
      price: 100 - Math.random() * 50,
    })
    .set("Authorization", `Bearer ${token2}`);
  //console.log(addMenuItemRes.body);
  const menuItemId = addMenuItemRes.body.at(-1).id;
  const menuItemDesc = addMenuItemRes.body.at(-1).description;
  const menuItemPrice = addMenuItemRes.body.at(-1).price;
  expect(addMenuItemRes.status).toBe(200);

  const createRes = await request(app)
    .post(`/api/franchise`)
    .send(generateFranchise())
    .set("Authorization", `Bearer ${token2}`);

  expect(createRes.status).toBe(200);
  //console.log(createRes.body);
  const fId = createRes.body.id;

  const storeRes = await request(app)
    .post(`/api/franchise/${fId}/store`)
    .send({ franchiseId: fId, name: "somalia" })
    .set("Authorization", `Bearer ${token2}`);

  expect(storeRes.status).toBe(200);

  const storeId = storeRes.body.id;
  //console.log(fId, storeId, menuItemId, menuItemDesc, menuItemPrice);
  const addRes = await request(app)
    .post("/api/order")
    .send({
      franchiseId: fId,
      storeId: storeId,
      items: [
        { menuId: menuItemId, description: menuItemDesc, price: menuItemPrice },
      ],
    })
    .set("Authorization", `Bearer ${token2}`);
  expect(addRes.status).toBe(200);
});

test("get orders", async () => {
  const listRes = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${token2}`);
  expect(listRes.status).toBe(200);
  //console.log(listRes.body);
});

function generateFranchise() {
  return {
    name: Math.random().toString(36).substring(2, 12),
    admins: [{ email: "a@jwt.com" }],
  };
}
