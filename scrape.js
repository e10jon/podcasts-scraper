const Inserter = require('./inserter')
const ProgressBar = require('progress')
const scrapeIt = require('scrape-it')

const scrape = async ({opts, url}) => {
  const {data} = await scrapeIt(url, opts)
  return data
}

const scrapeCategories = async () => {
  const {categories} = await scrape({
    opts: {
      categories: {
        listItem: 'a.top-level-genre',
        data: {
          title: '',
          url: {
            attr: 'href',
          }
        }
      }
    },
    url: 'https://itunes.apple.com/us/genre/podcasts/id26?mt=2',
  })
  return categories
}

const scrapeLetters = async (category) => {
  const {letters} = await scrape({
    opts: {
      letters: {
        listItem: 'ul.alpha li a',
        data: {
          url: {
            attr: 'href',
          }
        }
      }
    },
    url: category.url,
  })
  return letters
}

const scrapePages = async (letter) => {
  const {pages} = await scrape({
    opts: {
      pages: {
        listItem: 'ul.paginate li a',
        data: {
          url: {
            attr: 'href',
          }
        }
      }
    },
    url: letter.url,
  })
  return pages
}

const scrapePodcasts = async (page) => {
  const {podcasts} = await scrape({
    opts: {
      podcasts: {
        listItem: '#selectedcontent ul li a',
        data: {
          title: '',
          url: {
            attr: 'href'
          }
        }
      }
    },
    url: page.url,
  })
  return podcasts
}

const scrapePodcast = async (podcast) => {
  const details = await scrape({
    opts: {
      id: {
        attr: 'content',
        convert: (html) => parseInt(html, 10),
        selector: 'meta[name="apple:content_id"]',
      },
      reviewsAvg: {
        convert: (html) => {
          if (html) {
            return parseFloat(html)
          }
        },
        selector: 'span[itemprop="ratingValue"]'
      },
      reviewsCnt: {
        convert: (html) => {
          if (html) {
            return parseInt(html.split(' ')[0], 10)
          }
        },
        selector: '.rating-count',
      },
    },
    url: podcast.url,
  })
  return details
}

(async () => {
  const inserter = new Inserter()
  
  for (const category of await scrapeCategories()) {
    for (const letter of await scrapeLetters(category)) {
      const pages = await scrapePages(letter)

      for (let pageI = 0; pageI < pages.length; ++pageI) {
        const page = pages[pageI]
        const podcasts = await scrapePodcasts(page)
        const progressBar = new ProgressBar(`${category.title} page ${pageI + 1} :bar :elapseds :percent`, {total: podcasts.length})

        for (const podcast of podcasts) {
          await inserter.push({
            category: category.title,
            title: podcast.title,
            url: podcast.url,
            ...await scrapePodcast(podcast)
          })

          progressBar.tick()
        }
      }
    }
  }

  await inserter.insert()
})()