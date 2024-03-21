---
title: 'The Research Path to GPT-4, Part 2'
date: 2024-03-21
permalink: /blog/GPT-pathway-2/
---

_TLDR: This post follows the thread of papers authored by Alec Radford that ultimately led to GPT-4. It observes that original motivation for the next-token prediction was as a representation learning mechanism, and there appears to be a gradual (and somewhat accidental) realization that these models could be used for much more…_

[Part 1 here](https://teapearce.github.io/blog//GPT-pathway-1/)


## GPT-1: Improving Language Understanding by Generative Pre-Training, June 2018
**Authors:** Alec Radford, Karthik Narasimhan, Tim Salimans, Ilya Sutskever

The first official paper in the GPT series! (Though the paper doesn’t actually use the GPT acronym…) At its core this paper is a polished, comprehensive study combining the key ideas of the previous two papers we’ve reviewed in part 1. Following the prior works, GPT-1 is viewed as a vehicle to learn good representations via a generative objective, with the plan of using these representations for finetuning a linear layer on downstream classification tasks.

> _“Although large unlabeled text corpora are abundant, labeled data for… specific tasks is scarce, making it challenging for discriminatively trained models to perform adequately. We demonstrate that large gains on these tasks can be realized by generative pre-training of a language model on a diverse corpus of unlabeled text, followed by discriminative fine-tuning on each specific task.”_

GPT-1 is pretrained on the BooksCorpus, a dataset of 7k books (around 1 billion words) with a next token prediction objective. The model has a context length of 512 tokens, trained for one month on eight GPUs (~6k hours). 

The most obvious change from prior work is the shift from LSTM to the now ubiquitous (but then hot-off-the-press) transformer architecture — 12 layers, 120M params. An ablation shows this change by itself gives a 5% performance boost (compared to the pretraining boost of 15%).

Another significant change over the previous works is the level of **generality** the method targets. The model is evaluated on multiple benchmark tasks including sentiment analysis, question answering, and linguistic acceptability. And it does pretty well at all of them. The reason they give for this improvement is the diversity of the pretraining data,

> _“By pre-training on a diverse corpus with long stretches of contiguous text our model acquires significant world knowledge and ability to process long-range dependencies which are then successfully transferred to solving discriminative tasks such as question answering, semantic similarity assessment, entailment determination, and text classification, improving the state of the art on 9 of the 12 datasets.”_

While this benchmarking focuses on training linear classification heads on downstream tasks, importantly, they do a brief investigation into zero-shot capabilities. For example for Q and A benchmarks, they can choose the multiple choice answer that has highest likelihood under the generative model, or for sentiment analysis the words ‘very positive’ or ‘very negative’ are appended at the end of the sentence and the highest likelihood option is selected.

> _“We designed a series of heuristic solutions that use the underlying generative model to perform tasks without supervised finetuning”_

It’s hard to understate the significance of this seemingly innocuous analysis. While it’ll take another year or so for this idea to come to fruition, **this marks the initial realization that the models can effectively complete downstream tasks by being used in their native ‘generative’ modes** rather than by using model-surgery to extract their representations and finetune.

<!-- It’s interesting that the motivation for this analysis is to provide intuition for why generative modeling is a useful (rather than them seriously considering this as a primary mode of operation). -->
<!-- Reading these papers now, perhaps the most surprising thing is the lack of focus on the generative capabilities of these models — the generative objective is presented as a convenient pretext task to learn good representations from, rather as the main event. -->

<!-- “We’d like to better understand why language model pre-training of transformers is effective. A hypothesis is that the underlying generative model learns to perform many of the tasks we evaluate on in order to improve its language modeling capability” -->

The stated motivation for this zero-shot investigation is to gain intuition for why generative modeling is a useful. This suggests that the discovery of the effectiveness of using the models in their generative mode is gradual and somewhat accidental.


## GPT-2: Language Models are Unsupervised Multitask Learners, 2019
**Authors:** Alec Radford, Jeffrey Wu, Rewon Child, David Luan, Dario Amodei, Ilya Sutskever

There transition from GPT-1 to GPT-2 is a smooth one. The pretraining recipe is unchanged, but there is *more* of everything. More diversity, more data, more parameters. 

The model is 1.5B parameters, trained on 7 billion words from the new-collected WebText dataset (outbound linked webpages from Reddit). Context length is 1024.

**There is also one conceptual leap made in the paper**. Our story so far has seen generative modeling exploited as a mechanism to learn representations that will be repurposed for supervised learning systems. But now there is a twist, foreshadowed by GPT-1 — the generative mode is found to be effective at test time, used directly in downstream tasks, without the need for training new linear classification heads.

> _“We would like to move towards more general systems which can perform many tasks – eventually without the need to manually create and label a training dataset for each one”_

While predictive language models learn to model p(output\|input), in multitask settings this must be changed to, p(output\|input, task). And there are multiple tasks in language! **The key conceptual insight is that language is a special modality that allows the task to be encoded as part of the input**. This allows a language model to predict p(output\|input-with-task-appended), without requiring architectural changes. (Shout out to [1] for spearheading this.)

> _“Language provides a flexible way to specify tasks, inputs, and outputs all as a sequence of symbols. For example, a translation training example can be written as the sequence (translate to french, english text, french text). Likewise, a reading comprehension training example can be written as (answer the question, document, question, answer).”_

It’s hard to underestimate the impact of this shift in mindset. It means a user can simply ask, in plain English, for the task they want solved. No labeled datasets, no hacking in of classification heads, no backprop-ing gradients. 

Yet there is one caveat to this — the pretraining data distribution must be broad enough to have encountered the task. As such, a diverse, broad, rich, high-quality dataset is the lifeblood of the system. 

> _“Most prior work trained language models on a single domain of text, such as news articles, Wikipedia, or fiction books. Our approach motivates building as large and diverse a dataset as possible in order to collect natural language demonstrations of tasks in as varied of domains and contexts as possible… we want to avoid making assumptions about the tasks to be performed ahead of time.”_

Careful readers will note that this diversity is not a sudden introduction — it is a direct consequence of the conclusions in GPT-1 and GP(T)-0; success always depended on how well the pretraining distribution matched the downstream task distribution. 

A final highlight of the paper is its focus on model size. Note that by 2019, it was no great secret that bigger was usually better in deep learning (e.g. see the 2015 ResNet paper [2]). But it’s revealing that almost every figure and table in the paper showed performance progressing from 117M to 1.5B params, suggesting that model scale was top of mind for the authors. 

This paper also provides a first taste of some future downsides of LLMs. Data contamination between pretraining and test sets, and closed science — no information on training resources are shared, and the open-sourcing of the model weights is delayed.

[1] The Natural Language Decathlon: Multitask Learning as Question Answering

[2] Deep Residual Learning for Image Recognition