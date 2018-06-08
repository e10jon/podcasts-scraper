const {shuffle} = require('./helpers')
const {podcastsQueue} = require('./queues')
const {scrapePodcast} = require('./scrape')

const Inserter = require('./inserter')
const inserter = new Inserter()

podcastsQueue.process(async ({data: {category, podcast}}) => {
  const details = await scrapePodcast(podcast)
  const row = {
    category: category.title,
    title: podcast.title,
    url: podcast.url,
    ...details
  }
  await inserter.push(row)
  console.log(`Inserted: ${category.title} - ${podcast.title}`)
})
