const { chromium } = require('playwright-chromium')
const fs = require('fs')
const nodemailer = require('nodemailer')
require('dotenv').config()

const url =
  'https://www.pccomponentes.com/api-v1/products/search?categoryId=2194165b-70a8-4e4e-ab74-0007a55b73ab&sort=price_asc&channel=es&page=1&pageSize=40&enum_attribute_c89fa5c4-274e-4d00-b88e-1efb0c13ded0[]=dfb932c3-3f08-4d5d-b914-5f8fe4cf4988&buy_box_results[]=WINS_NEW'

async function sendEmail (firstArticleLink, price) {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }

  const mensaje = {
    from: 'alert.gpu1@gmail.com',
    to: 'fam1096@hotmail.com',
    subject: 'Nuevo precio',
    text: `El precio más bajo actual es: ${firstArticleLink} y su precio es: ${price}`
  }

  const transporter = nodemailer.createTransport(config)

  const send = await transporter.sendMail(mensaje)

  console.log(send)
}

async function readData (lowestPrice) {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  await page.goto(url, {
    waitUntil: 'load'
  })

  await page.screenshot({ path: 'screenshot.png' })

  const apiContent = JSON.parse(await page.$eval('*', (el) => el.innerText))
  const articles = apiContent.articles
  const outputList = []

  const firstArticle = articles[0]
  const firstArticleLink = `https://www.pccomponentes.com/${firstArticle.slug}`

  let newPriceFound = false

  articles.forEach((article) => {
    const output = `https://www.pccomponentes.com/${article.slug} -> ${article.promotionalPrice !== null
      ? article.promotionalPrice
      : article.originalPrice
      }`

    if (lowestPrice) {
      if (article.promotionalPrice !== null) {
        if (lowestPrice > article.promotionalPrice) {
          sendEmail(firstArticleLink, article.promotionalPrice)
          console.log('Correo enviado!')
          newPriceFound = true
        }
      } else {
        if (lowestPrice > article.originalPrice) {
          sendEmail(firstArticleLink, article.originalPrice)
          console.log('Correo enviado!')
          newPriceFound = true
        }
      }
    }

    outputList.push(output)
  })

  fs.writeFileSync('output.json', JSON.stringify(outputList, null, 2))

  await browser.close()

  if (!newPriceFound) {
    // sendEmail(firstArticleLink, readData.article.promotionalPrice)
    console.log('No se ha encontrado ningún precio más bajo\n')
  }
}

try {
  const jsonOutput = JSON.parse(fs.readFileSync('output.json'))
  const lowestPrice = +jsonOutput[0].split(' -> ')[1]

  readData(lowestPrice)
} catch (err) {
  readData()
}
