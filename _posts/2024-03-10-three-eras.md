---
title: 'Machine Learning Eras and their Bottlenecks'
date: 2024-03-10
permalink: /blog/2024/ML-eras-bottlenecks/
---

TLDR: Making sense of where we are in AI research by looking at the bottlenecks of each machine learning era so far, and where this suggests we’re headed.


The recent history of machine learning might broadly be grouped into three eras:

**Era 1: Shallow Learning (2000’s)**
Systems consisted of hand-designed feature extractors followed by simple learnable models. The main bottleneck was the quality of the feature extractors.

**Era 2: Supervised Deep Learning (2010’s)**
Feature extraction was absorbed into the learnable portion of the model, and systems were optimized end-to-end on human-labeled datasets using neural networks. The main bottleneck was the quantity of labeled data.

**Era 3: Self-Supervised Transformers (2020’s)**
Supervised learning objectives were replaced by self-supervised objectives, removing the need for human-labeled datasets. Transformers became the dominant architecture across data modalities. A new bottleneck emerged due to misalignment between the self-supervised objective and downstream use-cases.

**Observations:**
1. Sidestep the bottleneck don’t widen it.
   - Progression occurs by removing bottlenecks through new modeling philosophies.
2. Human requirements are decreasing, compute requirements are increasing.
   - Manual input required by humans becomes more abstracted, leading to increased reliance on compute.
3. Systems for different data modalities are increasingly homogenous.
   - Transformers dominate across tasks and modalities, leading to multi-modal models.

**Extrapolations:**
1. Era 4 will not have distinct pretraining and alignment phases.
   - Efforts will focus on sidestepping the need for alignment altogether.
2. A more abstracted reliance on humans.
   - Era 4 will continue to reduce reliance on human input, potentially learning from interaction with humans.
3. The AI research community will become monolithic.
   - Separate communities may merge as a single system works across all modalities.

