import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createSource } from '../source/source.mjs'

async function listen(t) {
  const server = createSource()
  server.listen(0, '127.0.0.1')
  await once(server,'listening')
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
  return { root: 'http://127.0.0.1:' + server.address().port }
}

import { chromium } from 'playwright'
test('浏览器能读取分页资料并识别过期暂存', async t => {
  const { root } = await listen(t)
  const browser = await chromium.launch({args:['--no-sandbox']})
  t.after(() => browser.close())
  const page = await browser.newPage()
  await page.goto(root + '/desk')
  const oldEdition = await page.getByRole('status',{name:'资料版'}).count() ?
    await page.getByRole('status',{name:'资料版'}).textContent() :
    await page.locator('output').textContent()
  assert.equal(oldEdition, 'r1')
  await fetch(root + '/control?edition=r2', {method:'POST'})
  const labels = ["航段", "订位人号", "座号"]
  for (const [i, label] of labels.entries()) await page.getByLabel(label).fill(['L','P2','2B'][i])
  await page.getByRole('button',{name: "暂留", exact:true}).click()
  assert.match(await page.locator('body').textContent(), /资料版已更换/)
  await page.goto(root + '/desk?view=' + "seats")
  let cells = []
  for (;;) {
    cells = cells.concat(await page.getByRole('table',{name:"seats",exact:true}).locator('td').allTextContents())
    const next = page.getByRole('link',{name:'下一页'})
    if (!await next.count()) break
    await next.click()
  }
  assert.ok(cells.includes("v2"))
  for (const [i, label] of labels.entries()) await page.getByLabel(label).fill(['L','P2','2B'][i])
  await page.getByRole('button',{name: "暂留", exact:true}).click()
  assert.match(await page.getByRole('table',{name:'本次门户操作'}).textContent(), /draft/)
})

test('承运方保留已经确认的回执并使逾期的暂留失效', async t => {
  const { root } = await listen(t)
  await fetch(root + '/control?edition=r2', {method:'POST'})
  const browser = await chromium.launch({args:['--no-sandbox']})
  t.after(() => browser.close())
  const page = await browser.newPage()
  await page.goto(root + '/desk')
  async function apply(person, seat, action) {
    await page.getByLabel('航段').fill('L')
    await page.getByLabel('订位人号').fill(person)
    await page.getByLabel('座号').fill(seat)
    await page.getByRole('button',{name:action,exact:true}).click()
  }
  await apply('P2','2B','暂留')
  await apply('P2','2B','核对暂留')
  await apply('P2','2B','逐人确认')
  await apply('P3','3A','暂留')
  const operations = page.getByRole('table',{name:'本次门户操作'})
  assert.match(await operations.textContent(), /P22BconfirmedRC-/)
  assert.match(await operations.textContent(), /P33Adraft/)
  await fetch(root + '/control?edition=r3', {method:'POST'})
  await page.goto(root + '/desk?view=clock')
  assert.match(await operations.textContent(), /P22BconfirmedRC-/)
  assert.match(await operations.textContent(), /P33Aexpired/)
})
