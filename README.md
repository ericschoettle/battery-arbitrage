## Motivation

Renewable energy growth has exploded in recent years, thanks to plummeting costs: solar panels cost [1/100th of what they did in 1980](https://www.greentechmedia.com/articles/read/why-pv-costs-have-fallen-so-far-and-will-fall-further#gs.6rmqff), leading to a 200% increase in deployed capacity in the last [five years alone](https://en.wikipedia.org/wiki/Growth_of_photovoltaics). Wind has a similar [story](https://en.wikipedia.org/wiki/Wind_power#/media/File:Wind_generation-with_semilog_plot.png); the result is that in the USA, new solar and wind are [cheaper](https://www.eia.gov/outlooks/aeo/pdf/electricity_generation.pdf) than any new fossil-fuel powered generation , and continuing to get cheaper.

But, with this cost-and-climate saving revolution in electicity production come some challenges; for instance, there is so much renewable energy on the grid in California that wholesale prices frequently [go negative](https://www.utilitydive.com/news/prognosis-negative-how-california-is-dealing-with-below-zero-power-market/442130/) in the spring(when the sun is bright and air conditioning loads are relatively small). It's hard to make money if, when you're producing the most, what you are selling is at it's absolute cheapest. 

Enter batteries. Cost declines of [74% since 2012](https://www.greentechmedia.com/articles/read/report-levelized-cost-of-energy-for-lithium-ion-batteries-bnef#gs.6r42eh), and continuing. Grid storage, a $1 billion/year market in 2017, is projected to grow to [13 billion/year in 2025](https://marketresearch.biz/report/energy-electricity-storage-market/). 

But how cheap do batteries need to be to make money storing energy during the daily lows and selling into the highs? How much capacity relative to their charge rate do they need to make the most money? This NPM module takes battery characteristics and real-world wholesale electricity prices and outputs when to buy, when to sell, and how much money could be made.  

## Use

_____details here_____

## How it works. 

in the Day Ahead Market (DAM), electricity is sold in hour-long increments, 24 hours in advance. 

![Zero hours of capacity](/images/0_hrs_capacity.png)


For the first hour of capacity, it's quite obvious - sell at the top of every peak, buy at the bottom of every valley. 

![One hour of capacity](/images/1_hrs_capacity.png)

For the second hour of capacity, you can't buy and sell at those same high's and lows, because your charge rate doesn't allow it (if it did, you'd have a bigger battery with a 1 hour capacity). So you go to the next best hours. 

![Two hours of capacity](/images/2_hrs_capacity.png)

Put together, it looks like this:

![gif](/images/algorithm.gif)