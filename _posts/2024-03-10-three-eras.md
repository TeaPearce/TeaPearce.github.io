---
title: 'Machine Learning Eras and their Bottlenecks'
date: 2024-03-10
permalink: /blog/2024/ML-eras-bottlenecks/
---

_TLDR: Making sense of where we are in AI research by looking at the bottlenecks of each machine learning era so far, and where this suggests we’re headed._


## Eras

The recent history of machine learning might broadly be grouped into three eras; Era 1, shallow learning. Era 2, supervised deep learning. Era 3, self-supervised transformers. Whilst Eras 1 and 2 are often described in introductory deep learning courses, there has been a more subtle, but just as significant, transition from Era 2 to 3.

**Era 1: Shallow Learning (2000’s).**
Systems were composed of two stages; an initial hand-designed feature extractor (e.g. SIFT, MFCC), followed by a simple learnable model (e.g. SVMs, Gaussian mixture models, decision trees). The main bottleneck to system performance was the quality of the feature extractors. 

**Era 2: Supervised Deep Learning (2010’s).**
Feature extraction was absorbed into the learnable portion of the model, removing the need for hand-designed heuristics. Systems were optimized end-to-end on human-labelled datasets using neural networks composed of multiple layers, with architectures matched to the data modality (e.g. CNNs for images, RNNs for sequences). With enough examples, any input-output mapping could be learned, but the main bottleneck was the quantity of labelled data that could feasibly be collected.

**Era 3: Self-Supervised Transformers (2020’s).**
Supervised learning objectives were replaced by simple self-supervised (generative) objectives. This removed the requirement for human-labelled datasets and alleviated the bottleneck on data quantity. There was convergence across data modalities on the transformer architecture (text, images, videos, robotics). A new bottleneck emerged caused by the misalignment between the self-supervised objective on the pretraining distribution, and the downstream use-cases. Post-hoc methods such as RLHF emerged to address this.

## Observations

From these descriptions, several trends become clear. 

**Observation 1.** Sidestep the bottleneck don’t widen it.
   - __Progression from an era is only achieved by removing the bottleneck through a new modeling philosophy, not by widening it!__ We did not surpass Era 1 by hand-crafting better feature extractors (though most people worked on that), we moved forward by coming up with an approach that avoided the need for hand-crafting at all. We moved from Era 2 to 3 not by increasing the amount of labelled data available (although many research communities focused on variants of this — active learning, semi-supervised learning), but by avoiding the need to label data by using a self-supervised objective.

**Observation 2.** Human requirements are decreasing, compute requirements are increasing.
   - In each era, the manual input required by humans becomes more abstracted, from feature engineers, to labellers and architects, to demonstrators. This also means that systems must increasingly learn by themselves, which has led to each era leveraging more compute than its predecessor.  

**Observation 3.** Systems for different data modalities are increasingly homogenous.
   - In Era 1, each task within a modality required a new system (replacing the learned component, and possibly requiring new features to be extracted). In Era 2, architectural components would be common within a modality (e.g. convolutions for image classification/segmentation/depth prediction) though different across modalities. Datasets would largely be task-specific. Era 3 has seen a single architecture (transformer) dominate across tasks and modalities, and datasets for each modality provide a strong pretrained start-point for multiple tasks within that modality. We are beginning to see multi-modal models, though these are bottlenecked by the quantity of aligned data across modalities. 

## Extrapolations
It’s risky to extrapolate based on three datapoints, but since we are collecting them at a rate of one per decade, let’s have a go at extrapolating what Era 4 might look like.

**Extrapolation 1.** Era 4 will not have distinct pretraining and alignment phases.
   - Currently, a large amount of effort goes into taking a pretrained self-supervised transformer, and aligning it (e.g. SFT, RLHF, DPO) to suit downstream users’ needs. It’s hard work and numerous issues persist (e.g. hallucinations, bias, jailbreaking). New eras are created by adopting a modeling paradigm that sidesteps the bottleneck of the previous era (Observation 1). Rather than having improved alignment methods, Era 4 will instead have sidestepped the need for this alignment phase altogether. 

**Extrapolation 2.** A more abstracted reliance on humans.
   - Observation 2 notes a trend towards less reliance on manual human input. While Era 3 systems largely ignore human design, human-generated datasets remain at their core. This imposes a hard limit on what a system can learn. Era 4 will continue to reduce reliance on human input, perhaps in a role even more abstract than as demonstrators (e.g. learning from interaction with humans).

**Extrapolation 3.** The AI research community will become monolithic.
   - Observation 3 suggests a trend towards a single system that will work across all modalities. It may not make sense to have separate communities working on computer vision, language, robotics etc., as all these areas will be jointly training and utilizing the same common model(s).

