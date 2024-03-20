---
title: 'The Research Pathway to GPT-4, Part 1'
date: 2024-03-19
permalink: /blog/2024/GPT-pathway/
---

_TLDR: This post follows the thread of papers authored by Alec Radford that ultimately led to GPT-4. It observes that original motivation for the next-token prediction was as a representation learning mechanism, and there appears to be a gradual (and somewhat accidental) realization that these models could be used for much more…_


## Pre-GPT: Unsupervised Representation Learning with Deep Convolutional Generative Adversarial Networks, November 2015
**Authors:** Alec Radford, Luke Metz, Soumith Chintala

Our story starts with Alec Radford’s first paper. Whilst it may be best-known for introducing the DCGAN, it’s the modeling *philosophy* that we’re interested in here. It starts with one key observation upon which the entire LLM paradigm ends up being built — unlabeled data is abundant!

> _“In the context of computer vision, one can leverage the practically unlimited amount of unlabeled images and videos to learn good intermediate representations, which can then be used on a variety of supervised learning tasks”_

Recall that at the time (late 2015), nearly all of deep learning was focused on supervised hand-labeled datasets. It’s visionary, really, that this paper foresaw (and pursued) the higher value locked away in larger unlabeled datasets.

The concrete approach in the paper trains a generative model (DCGAN) on a broad-ish dataset (ImageNet). After this pretraining phase, the discriminator can be used to extract features from some new dataset (e.g. CIFAR-10), with a linear classification-head trained on top. The results are inline with other SOTA unsupervised methods of the time.

There’s a long way to go to GPT-4, but this paper has unearthed a key foundational idea here — generative modeling on large unlabeled datasets FTW.

> _“We give evidence that [GANs] learn good representations of images for supervised learning”_

## GP(T)-0: Learning to Generate Reviews and Discovering Sentiment, April 2017
**Authors:** Alec Radford, Rafal Jozefowicz, Ilya Sutskever

I’ve come to think of this as GP(T)-0. While it’s not a transformer, it does generative pre-training at large-scale (for the time) on language. The paper makes two findings that will be pivotal to the development of LLMs. 1) A low-level future sequence-prediction objective *can* lead toa model learning high-level concepts. 2) The pretraining dataset distribution should align with the downstream data distribution.

Tokens were not quite a thing, rather the model is trained to predict the next character in a sequence (more accurately bytes of a UTF-8 encoding). The dataset is made up of reviews from Amazon (around 8 billion words). It uses an LSTM (4096 hidden units), context length 256, and is trained for one month on four GPUs.

The paper’s focus is on the _representations_ the this pretrained model learns. In particular, they study the task of ‘sentiment analysis’, identifying a single neuron whose activation value is indicative of the sentiment of the sequence it’s parsing. Using this single sentiment neuron, thresholded as a classifier, they report results on IMDB inline with baseline methods.

This is early support for a what’s subsequently become a cornerstone intuition about the next-token prediction objective — a model must acquire an understanding of abstract concepts in order to predict the future of a text passage. Here it’s demonstrated that models *do* infer something as abstract as the sentiment of a review when trained on a simple generative objective. As the authors say of the time,

> _“it is not immediately clear whether such a low-level training objective supports the learning of high-level representations.”_

Something interesting about this paper is that it signals the authors' dataset-first thinking. Regarding the pretraining dataset selection, the authors note,

> _“We train on a very large corpus picked to have a similar distribution as our task of interest.”_

Specifically, they've chosen to pretrain on Amazon reviews, and test on semantic benchmarks like IMDB and Yelp. Even on Yelp they blame a plateau of performance on Yelp reviews being about businesses not products. They do brief experiments on other tasks (semantic relatedness and paraphrase detection) using text from other domains and again find limited performance, blaming the data mismatch in train and test distributions. This turns out to be a key insight that guides the authors to pursue training on increasingly diverse datasets.

As something of an afterthought, they show some shaky generations from the model. Holding the ‘sentiment neuron’ at a fixed value allows control over the sentiment of the generated sentence.

> _“Although the focus … has been on the properties of our model’s representation, it is trained as a generative model and we are also interested in its generative capabilities”_