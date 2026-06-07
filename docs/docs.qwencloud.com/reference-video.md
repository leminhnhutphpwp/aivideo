> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Reference-to-video

> Replicate motion and look

Wan-R2V accepts multimodal input (text, image, video, and audio) to generate performance videos. Use prompts to cast people or objects as the main characters.

**Quick links**: [API reference](/api-reference/video-generation/wan27-reference-to-video/create-task) | [Prompt guide](/developer-guides/accuracy-tuning/video-generation)

## Getting started

Before you start, get an API key and set it as an environment variable. To use an SDK, install the DashScope SDK.

**Input prompt**: *"Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, 'Why did you still come?' Image 1 replies, 'Let's talk.'"*

| **Input**                                                                                                                                                                                                                                                              | **Type** | **Role**             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------- |
| [wan-r2v-girl-en.mp4](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4) + [reference voice](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3) | Video    | Video 1 (character)  |
| [wan-r2v-boy-en.jpg](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg) + [reference voice](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3)         | Image    | Image 1 (character)  |
| [wan-r2v-bg-en.jpg](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg)                                                                                                                                             | Image    | Image 2 (background) |

**Output**: Multi-shot video with audio.

<Tabs>
  <Tab title="Python">
    <Note>Ensure that the DashScope Python SDK version is at least **1.25.16**.</Note>

    ```python
    # -*- coding: utf-8 -*-
    from http import HTTPStatus
    from dashscope import VideoSynthesis
    import dashscope
    import os

    # Set the base URL
    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # Set your API key
    api_key = os.getenv("DASHSCOPE_API_KEY")

    media = [
      {
        "type": "reference_video",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3"
      },
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3"
      },
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg"
      }
    ]

    print('please wait...')
    rsp = VideoSynthesis.call(
      api_key=api_key,
      model="wan2.7-r2v",
      media=media,
      resolution="720P",
      ratio="16:9",
      duration=10,
      prompt_extend=False,
      watermark=True,
      prompt="Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, \"Why did you still come?\" Image 1 replies, \"Let's talk.\"",
    )
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print("video_url:", rsp.output.video_url)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))
    ```
  </Tab>

  <Tab title="Java">
    <Note>Ensure that the DashScope Java SDK version is at least **2.22.14**.</Note>

    ```java
    // Copyright (c) Alibaba, Inc. and its affiliates.

    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.alibaba.dashscope.utils.JsonUtils;

    import java.util.ArrayList;
    import java.util.List;

    public class Ref2Video {

        static {
            // Set the base URL
            Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // Set your API key
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        public static void ref2video() throws ApiException, NoApiKeyException, InputRequiredException {
            VideoSynthesis vs = new VideoSynthesis();
            final String prompt = "Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, \"Why did you still come?\" Image 1 replies, \"Let's talk.\"";
            List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4")
                        .type("reference_video")
                        .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3")
                        .build());
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg")
                        .type("reference_image")
                        .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3")
                        .build());
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg")
                        .type("reference_image")
                        .build());
            }};
            VideoSynthesisParam param =
                    VideoSynthesisParam.builder()
                            .apiKey(apiKey)
                            .model("wan2.7-r2v")
                            .prompt(prompt)
                            .media(media)
                            .watermark(true)
                            .duration(10)
                            .resolution("720P")
                            .ratio("16:9")
                            .promptExtend(false)
                            .build();
            System.out.println("please wait...");
            VideoSynthesisResult result = vs.call(param);
            System.out.println(JsonUtils.toJson(result));
        }

        public static void main(String[] args) {
            try {
                ref2video();
            } catch (ApiException | NoApiKeyException | InputRequiredException e) {
                System.out.println(e.getMessage());
            }
            System.exit(0);
        }
    }
    ```
  </Tab>

  <Tab title="curl">
    **Step 1: Create a task and get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
        -H 'X-DashScope-Async: enable' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
        "model": "wan2.7-r2v",
        "input": {
            "prompt": "Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, \"Why did you still come?\" Image 1 replies, \"Let's talk.\" ",
            "media": [
                {
                    "type": "reference_video",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4",
                    "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3"
                },
                {
                    "type": "reference_image",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg",
                    "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3"
                },
                {
                    "type": "reference_image",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg"
                }
            ]
        },
        "parameters": {
            "resolution": "720P",
            "ratio": "16:9",
            "duration": 10,
            "prompt_extend": false,
            "watermark": true
        }
    }'
    ```

    **Step 2: Retrieve the result using the task ID**

    Replace `{task_id}` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

## Supported models

See [Video generation models](/developer-guides/getting-started/video-models) for a complete list of available models.

## Core capabilities (wan2.7)

### Single-image reference (multi-panel image)

**Supported models**: `wan2.7 series`.

**Description**: You can input a multi-panel image (storyboard). The model automatically detects the multi-panel layout and generates a video with consistent characters, scenes, and shots. You can input **only one** multi-panel image at a time.

**Parameters**:

- `media.type`: Set to `reference_image`.
- `media.url`: The URL or base64-encoded string of the multi-panel image.
- `prompt`: If you provide only one reference image or video, use "**reference image**" or "**reference video**".

**Input prompt**: *"Reference image, 3D cartoon adventure movie style, chibi characters with detailed textures, smooth actions, and vibrant colors. Keep the characters and forest scene consistent. Do not add text. Atmosphere: Adventurous, lighthearted, mysterious, whimsical. Characters: Boy explorer: round hat, backpack, short cloak. Sidekick: a flying small robot with a round body and blue glowing eyes. Scene: Fantasy forest with giant tree roots, mushrooms, vines, a treasure cave entrance, and sunbeams. Storyboard: 1. Wide shot: Tall trees and interlaced light beams in a mysterious and bright fantasy forest. 2. Medium shot: The boy pushes aside vines to explore. 3. Medium shot: The small robot flies beside him, scanning ahead with a blue light. 4. Close-up: An old treasure map unfolds in the boy's hands. 5. Close-up: He shows an excited expression, his eyes lighting up. 6. Action shot: The two jump over tree roots and a stream, continuing deeper into the forest. 7. Medium shot: A moss-covered treasure chest is revealed behind the vines. 8. Close-up: A golden glow shines from the edge of the treasure chest. 9. Final shot: The boy and the small robot stand before the treasure chest, looking at each other in surprise, full of adventure."*

| **Input multi-panel image**                                                                                                               | **Output video** |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| ![banana\_storyboard](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png) | Generated video  |

<Tabs>
  <Tab title="Python">
    <Note>Ensure that the DashScope Python SDK version is at least **1.25.16**.</Note>

    ```python
    # -*- coding: utf-8 -*-
    from http import HTTPStatus
    from dashscope import VideoSynthesis
    import dashscope
    import os

    # Set the base URL
    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # Set your API key
    api_key = os.getenv("DASHSCOPE_API_KEY")

    media = [
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png"
      }
    ]

    def sample_sync_call():
      print('----sync call, please wait a moment----')
      rsp = VideoSynthesis.call(
        api_key=api_key,
        model="wan2.7-r2v",
        media=media,
        resolution="720P",
        ratio="16:9",
        duration=10,
        prompt_extend=False,
        watermark=True,
        prompt="Reference image, 3D cartoon adventure movie style, chibi characters with detailed textures, smooth actions, and vibrant colors. Keep the characters and forest scene consistent. Do not add text. Atmosphere: Adventurous, lighthearted, mysterious, whimsical. Characters: Boy explorer: round hat, backpack, short cloak. Sidekick: a flying small robot with a round body and blue glowing eyes. Scene: Fantasy forest with giant tree roots, mushrooms, vines, a treasure cave entrance, and sunbeams. Storyboard: 1. Wide shot: Tall trees and interlaced light beams in a mysterious and bright fantasy forest. 2. Medium shot: The boy pushes aside vines to explore. 3. Medium shot: The small robot flies beside him, scanning ahead with a blue light. 4. Close-up: An old treasure map unfolds in the boy's hands. 5. Close-up: He shows an excited expression, his eyes lighting up. 6. Action shot: The two jump over tree roots and a stream, continuing deeper into the forest. 7. Medium shot: A moss-covered treasure chest is revealed behind the vines. 8. Close-up: A golden glow shines from the edge of the treasure chest. 9. Final shot: The boy and the small robot stand before the treasure chest, looking at each other in surprise, full of adventure.",
      )
      if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' %
          (rsp.status_code, rsp.code, rsp.message))

    if __name__ == '__main__':
      sample_sync_call()
    ```
  </Tab>

  <Tab title="Java">
    <Note>Ensure that the DashScope Java SDK version is at least **2.22.14**.</Note>

    ```java
    // Copyright (c) Alibaba, Inc. and its affiliates.

    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.alibaba.dashscope.utils.JsonUtils;

    import java.util.ArrayList;
    import java.util.List;

    public class Ref2Video {

        static {
            // Set the base URL
            Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // Set your API key
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        public static void syncCall() {
            VideoSynthesis videoSynthesis = new VideoSynthesis();
            final String prompt = "Reference image, 3D cartoon adventure movie style, chibi characters with detailed textures, smooth actions, and vibrant colors. Keep the characters and forest scene consistent. Do not add text. Atmosphere: Adventurous, lighthearted, mysterious, whimsical. Characters: Boy explorer: round hat, backpack, short cloak. Sidekick: a flying small robot with a round body and blue glowing eyes. Scene: Fantasy forest with giant tree roots, mushrooms, vines, a treasure cave entrance, and sunbeams. Storyboard: 1. Wide shot: Tall trees and interlaced light beams in a mysterious and bright fantasy forest. 2. Medium shot: The boy pushes aside vines to explore. 3. Medium shot: The small robot flies beside him, scanning ahead with a blue light. 4. Close-up: An old treasure map unfolds in the boy's hands. 5. Close-up: He shows an excited expression, his eyes lighting up. 6. Action shot: The two jump over tree roots and a stream, continuing deeper into the forest. 7. Medium shot: A moss-covered treasure chest is revealed behind the vines. 8. Close-up: A golden glow shines from the edge of the treasure chest. 9. Final shot: The boy and the small robot stand before the treasure chest, looking at each other in surprise, full of adventure.";
            List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png")
                        .type("reference_image")
                        .build());
            }};
            VideoSynthesisParam param =
                    VideoSynthesisParam.builder()
                            .apiKey(apiKey)
                            .model("wan2.7-r2v")
                            .prompt(prompt)
                            .media(media)
                            .watermark(true)
                            .duration(10)
                            .resolution("720P")
                            .ratio("16:9")
                            .promptExtend(false)
                            .build();
            VideoSynthesisResult result = null;
            try {
                System.out.println("---sync call, please wait a moment----");
                result = videoSynthesis.call(param);
            } catch (ApiException | NoApiKeyException e){
                throw new RuntimeException(e.getMessage());
            } catch (InputRequiredException e) {
                throw new RuntimeException(e);
            }
            System.out.println(JsonUtils.toJson(result));
        }

        public static void main(String[] args) {
            syncCall();
        }
    }
    ```
  </Tab>

  <Tab title="curl">
    **Step 1: Create a task and get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
        -H 'X-DashScope-Async: enable' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
        "model": "wan2.7-r2v",
        "input": {
            "prompt": "Reference image, 3D cartoon adventure movie style, chibi characters with detailed textures, smooth actions, and vibrant colors. Keep the characters and forest scene consistent. Do not add text. Atmosphere: Adventurous, lighthearted, mysterious, whimsical. Characters: Boy explorer: round hat, backpack, short cloak. Sidekick: a flying small robot with a round body and blue glowing eyes. Scene: Fantasy forest with giant tree roots, mushrooms, vines, a treasure cave entrance, and sunbeams. Storyboard: 1. Wide shot: Tall trees and interlaced light beams in a mysterious and bright fantasy forest. 2. Medium shot: The boy pushes aside vines to explore. 3. Medium shot: The small robot flies beside him, scanning ahead with a blue light. 4. Close-up: An old treasure map unfolds in the boy'\''s hands. 5. Close-up: He shows an excited expression, his eyes lighting up. 6. Action shot: The two jump over tree roots and a stream, continuing deeper into the forest. 7. Medium shot: A moss-covered treasure chest is revealed behind the vines. 8. Close-up: A golden glow shines from the edge of the treasure chest. 9. Final shot: The boy and the small robot stand before the treasure chest, looking at each other in surprise, full of adventure.",
            "media": [
                {
                    "type": "reference_image",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png"
                }
            ]
        },
        "parameters": {
            "resolution": "720P",
            "ratio": "16:9",
            "duration": 10,
            "prompt_extend": false,
            "watermark": true
        }
    }'
    ```

    **Step 2: Retrieve the result using the task ID**

    Replace `{task_id}` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

### Multi-entity reference and voice customization

**Supported models**: `wan2.7 series`.

**Description**: You can input multiple reference images and videos as entity materials. You can also specify a unique voice for each entity to enable multi-character interaction and voice differentiation.

**Parameters**:

- `media`: An array of reference materials.
  - `media.type`: Supports `reference_image` and `reference_video`. **The total number of reference images and videos cannot exceed 5**.
  - `media.url`: The URL of the material. Images also support base64-encoded strings.
  - `media.reference_voice` (optional): The audio URL to specify the voice for the entity. Use this with `reference_image` or `reference_video`.

    **Audio logic**: If a `reference_video` contains audio and `reference_voice` is not specified, the original video audio is used by default. If both are provided, `reference_voice` overwrites the original video audio.

- `prompt`: Refer to the reference materials in the prompt according to the following rules:
  - Use identifiers such as **Image 1, Image 2** for `reference_image` assets and **Video 1, Video 2** for `reference_video` assets.
  - The reference order of the materials is defined by the `media` array. Images and videos are counted separately.

**Input prompt**: *"Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, 'Why did you still come?' Image 1 replies, 'Let's talk.'"*

| **Input**                                                                                                                                                                                                                                                              | **Type** | **Role**             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------- |
| [wan-r2v-girl-en.mp4](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4) + [reference voice](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3) | Video    | Video 1 (character)  |
| [wan-r2v-boy-en.jpg](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg) + [reference voice](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3)         | Image    | Image 1 (character)  |
| [wan-r2v-bg-en.jpg](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg)                                                                                                                                             | Image    | Image 2 (background) |

**Output**: Multi-shot video with audio.

<Tabs>
  <Tab title="Python">
    <Note>Ensure that the DashScope Python SDK version is at least **1.25.16**.</Note>

    ```python
    # -*- coding: utf-8 -*-
    from http import HTTPStatus
    from dashscope import VideoSynthesis
    import dashscope
    import os

    # Set the base URL
    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # Set your API key
    api_key = os.getenv("DASHSCOPE_API_KEY")

    media = [
      {
        "type": "reference_video",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3"
      },
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg",
        "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3"
      },
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg"
      }
    ]

    def sample_sync_call():
      print('----sync call, please wait a moment----')
      rsp = VideoSynthesis.call(
        api_key=api_key,
        model="wan2.7-r2v",
        media=media,
        resolution="720P",
        ratio="16:9",
        duration=10,
        prompt_extend=False,
        watermark=True,
        prompt="Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, \"Why did you still come?\" Image 1 replies, \"Let's talk.\"",
      )
      if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' %
          (rsp.status_code, rsp.code, rsp.message))

    if __name__ == '__main__':
      sample_sync_call()
    ```
  </Tab>

  <Tab title="Java">
    <Note>Ensure that the DashScope Java SDK version is at least **2.22.14**.</Note>

    ```java
    // Copyright (c) Alibaba, Inc. and its affiliates.

    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.alibaba.dashscope.utils.JsonUtils;

    import java.util.ArrayList;
    import java.util.List;

    public class Ref2Video {

        static {
            // Set the base URL
            Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // Set your API key
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        public static void syncCall() {
            VideoSynthesis videoSynthesis = new VideoSynthesis();
            final String prompt = "Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, \"Why did you still come?\" Image 1 replies, \"Let's talk.\"";
            List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4")
                        .type("reference_video")
                        .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3")
                        .build());
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg")
                        .type("reference_image")
                        .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3")
                        .build());
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg")
                        .type("reference_image")
                        .build());
            }};
            VideoSynthesisParam param =
                    VideoSynthesisParam.builder()
                            .apiKey(apiKey)
                            .model("wan2.7-r2v")
                            .prompt(prompt)
                            .media(media)
                            .watermark(true)
                            .duration(10)
                            .resolution("720P")
                            .ratio("16:9")
                            .promptExtend(false)
                            .build();
            VideoSynthesisResult result = null;
            try {
                System.out.println("---sync call, please wait a moment----");
                result = videoSynthesis.call(param);
            } catch (ApiException | NoApiKeyException e){
                throw new RuntimeException(e.getMessage());
            } catch (InputRequiredException e) {
                throw new RuntimeException(e);
            }
            System.out.println(JsonUtils.toJson(result));
        }

        public static void main(String[] args) {
            syncCall();
        }
    }
    ```
  </Tab>

  <Tab title="curl">
    **Step 1: Create a task and get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
        -H 'X-DashScope-Async: enable' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
        "model": "wan2.7-r2v",
        "input": {
            "prompt": "Video 1 walks in from the deep left side of the frame. Then the shot cuts to a close-up of Image 1. Video 1 is leaning against the rusty wall on the right side from Image 2. Hearing the footsteps, she slowly turns her head. After seeing Image 1, Video 1 says, \"Why did you still come?\" Image 1 replies, \"Let's talk.\" ",
            "media": [
                {
                    "type": "reference_video",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pfgcuv/wan-r2v-girl-en.mp4",
                    "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/exiikq/wan-r2v-girl-demo-voice-en.mp3"
                },
                {
                    "type": "reference_image",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/skhalj/wan-r2v-boy-en.jpg",
                    "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/pqxdoi/wan-r2v-boy-voice-en.mp3"
                },
                {
                    "type": "reference_image",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260416/vyqjxd/wan-r2v-bg-en.jpg"
                }
            ]
        },
        "parameters": {
            "resolution": "720P",
            "ratio": "16:9",
            "duration": 10,
            "prompt_extend": false,
            "watermark": true
        }
    }'
    ```

    **Step 2: Retrieve the result using the task ID**

    Replace `{task_id}` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

### Multi-entity reference and first-frame control

**Supported models**: `wan2.7 series`.

**Description**: This feature adds first-frame control to the entity reference feature, which gives you more control over the composition and content flow of the video.

**Parameters**:

- `media`: An array of reference materials.
  - `media.type`: Supports `first_frame`, `reference_image`, and `reference_video`.

    You can provide a maximum of one first-frame image. You must provide at least one reference image or video. **The total number of reference images and videos cannot exceed 5**.

  - `media.url`: The URL of the material. Images also support base64-encoded strings.

- `prompt`: Refer to the reference materials in the prompt according to the following rules:
  - Use "**Image 1, Image 2**" to refer to `reference_image` assets and "**Video 1, Video 2**" to refer to `reference_video` assets.
  - The reference order of the materials is defined by the `media` array. Images and videos are counted separately.
  - You do not need to reference the first frame in the prompt.

**Input prompt**: *"An overhead shot captures a blue planet. The camera gradually zooms in toward the surface and cuts to a close-up of Image 1, who is holding Image 2 and eating it while saying: Why is not anyone coming to hang out with me?"*

| **Input**                                                                                                                       | **Type**    | **Role**              |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------- |
| ![first-frame](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/ixwovg/wan2.7-r2v-first-frame.webp) | First frame | Reference first frame |
| ![image-1](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/fkltfw/wan2.7-r2v-image-qq.webp)        | Image       | Image 1 (entity)      |
| ![image-2](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/kxkbsv/wan2.7-r2v-image-ob.webp)        | Image       | Image 2 (object)      |

**Output**: Video generated with the aspect ratio of the first frame.

<Tabs>
  <Tab title="Python">
    <Note>Ensure that the DashScope Python SDK version is at least **1.25.16**.</Note>

    ```python
    # -*- coding: utf-8 -*-
    from http import HTTPStatus
    from dashscope import VideoSynthesis
    import dashscope
    import os

    # Set the base URL
    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # Set your API key
    api_key = os.getenv("DASHSCOPE_API_KEY")

    media = [
      {
        "type": "first_frame",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/ixwovg/wan2.7-r2v-first-frame.webp"
      },
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/fkltfw/wan2.7-r2v-image-qq.webp"
      },
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/kxkbsv/wan2.7-r2v-image-ob.webp"
      }
    ]

    def sample_sync_call():
      print('----sync call, please wait a moment----')
      rsp = VideoSynthesis.call(
        api_key=api_key,
        model="wan2.7-r2v",
        media=media,
        resolution="720P",
        duration=10,
        prompt_extend=False,
        watermark=True,
        prompt="An overhead shot captures a blue planet. The camera gradually zooms in toward the surface and cuts to a close-up of Image 1, who is holding Image 2 and eating it while saying: Why is not anyone coming to hang out with me?",
      )
      if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' %
          (rsp.status_code, rsp.code, rsp.message))

    if __name__ == '__main__':
      sample_sync_call()
    ```
  </Tab>

  <Tab title="Java">
    <Note>Ensure that the DashScope Java SDK version is at least **2.22.14**.</Note>

    ```java
    // Copyright (c) Alibaba, Inc. and its affiliates.

    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.alibaba.dashscope.utils.JsonUtils;

    import java.util.ArrayList;
    import java.util.List;

    public class Ref2Video {

        static {
            // Set the base URL
            Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // Set your API key
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        public static void syncCall() {
            VideoSynthesis videoSynthesis = new VideoSynthesis();
            final String prompt = "An overhead shot captures a blue planet. The camera gradually zooms in toward the surface and cuts to a close-up of Image 1, who is holding Image 2 and eating it while saying: Why is not anyone coming to hang out with me?";
            List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/ixwovg/wan2.7-r2v-first-frame.webp")
                        .type("first_frame")
                        .build());
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/fkltfw/wan2.7-r2v-image-qq.webp")
                        .type("reference_image")
                        .build());
                add(VideoSynthesisParam.Media.builder()
                        .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/kxkbsv/wan2.7-r2v-image-ob.webp")
                        .type("reference_image")
                        .build());
            }};
            VideoSynthesisParam param =
                    VideoSynthesisParam.builder()
                            .apiKey(apiKey)
                            .model("wan2.7-r2v")
                            .prompt(prompt)
                            .media(media)
                            .watermark(true)
                            .duration(10)
                            .resolution("720P")
                            .promptExtend(false)
                            .build();
            VideoSynthesisResult result = null;
            try {
                System.out.println("---sync call, please wait a moment----");
                result = videoSynthesis.call(param);
            } catch (ApiException | NoApiKeyException e){
                throw new RuntimeException(e.getMessage());
            } catch (InputRequiredException e) {
                throw new RuntimeException(e);
            }
            System.out.println(JsonUtils.toJson(result));
        }

        public static void main(String[] args) {
            syncCall();
        }
    }
    ```
  </Tab>

  <Tab title="curl">
    **Step 1: Create a task and get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
        -H 'X-DashScope-Async: enable' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
        "model": "wan2.7-r2v",
        "input": {
            "prompt": "An overhead shot captures a blue planet. The camera gradually zooms in toward the surface and cuts to a close-up of Image 1, who is holding Image 2 and eating it while saying: Why is not anyone coming to hang out with me?",
            "media": [
                {
                    "type": "first_frame",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/ixwovg/wan2.7-r2v-first-frame.webp"
                },
                {
                    "type": "reference_image",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/fkltfw/wan2.7-r2v-image-qq.webp"
                },
                {
                    "type": "reference_image",
                    "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260414/kxkbsv/wan2.7-r2v-image-ob.webp"
                }
            ]
        },
        "parameters": {
            "resolution": "720P",
            "duration": 10,
            "prompt_extend": false,
            "watermark": true
        }
    }'
    ```

    **Step 2: Retrieve the result using the task ID**

    Replace `{task_id}` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

## Provide references

Pass reference images, videos, and audio to the `media` array.

### Input images

- **Number of first frames**: A maximum of one first frame (`media.type=first_frame`) is allowed.
- **Number of reference images**: A maximum of five reference images (`media.type=reference_image`) are allowed. The total number of reference images and reference videos cannot exceed 5.
- **Input methods**:
  - Public URL: Supports HTTP or HTTPS protocols. Example: `https://xxxx/xxx.png`.
  - Base64-encoded string: Use the `data:{MIME_type};base64,{base64_data}` format, where:
    - `{base64_data}`: The Base64-encoded string of the image file.
    - `{MIME_type}`: The Multipurpose Internet Mail Extensions (MIME) type of the image. The type must match the file format.

| **Image format** | **MIME type** |
| ---------------- | ------------- |
| JPEG             | image/jpeg    |
| JPG              | image/jpeg    |
| PNG              | image/png     |
| BMP              | image/bmp     |
| WEBP             | image/webp    |

### Input videos

- **Number of reference videos**: A maximum of five reference videos (`media.type=reference_video`) are allowed. The total number of reference images and reference videos cannot exceed 5.
- **Input methods**:
  - Public URL: Supports HTTP or HTTPS protocols. Example: `https://xxxx/xxx.mp4`.

### Input audio

- **Limits**: The reference voice (`media.reference_voice`) can be used only with `reference_image` or `reference_video` to specify the voice for the corresponding entity role.
- **Input methods**:
  - Public URL: Supports HTTP or HTTPS protocols. Example: `https://xxxx/xxx.mp3`.

## Output video

- **Number of videos**: 1.
- **Video specifications**: The format is MP4.
- **Video URL validity period**: **24 hours**.
- **Video dimensions**:
  - **wan2.7 series**: The `resolution` parameter controls the resolution level (720p or 1080p), and the `ratio` parameter controls the aspect ratio (16:9, 9:16, 1:1, 4:3, or 3:4).
    - If a first frame image is provided, the `ratio` parameter is ignored. The aspect ratio of the output video approximates that of the first frame image.
    - If a first frame image is not provided, the aspect ratio is specified by the `ratio` parameter. The default is 16:9.

## Billing and rate limiting

- For free quota information, see [Free quota](/resources/free-quota).
- Billing details:
  - Input images are free of charge. Input and output videos are billed based on their **duration in seconds**.
  - Failed model calls or processing faults do not incur charges or consume the [free quota](/resources/free-quota).
- **Billing formula**: `Total billable duration (seconds) = Billable duration of input video (seconds) + Duration of output video (seconds)`.

<Tabs>
  <Tab title="Wan 2.7 series models">
    **Billable duration of input video**: The maximum is 5 seconds. `Truncation limit per video = 5 seconds / Number of input reference videos (reference images and the first frame image are excluded)`. Each video is billed based on `min(actual duration, truncation limit)`. The billable durations for multiple videos are added together.

| **Number of reference videos** | **Truncation limit per video** |
| ------------------------------ | ------------------------------ |
| 1                              | 5s                             |
| 2                              | 2.5s                           |
| 3                              | 1.65s                          |
| 4                              | 1.25s                          |
| 5                              | 1s                             |

    **Example**: If the input is 2 reference videos + 1 image, the image is excluded from the count. The truncation limit is calculated based on 2 reference videos, resulting in 2.5 seconds per video. `Billable input duration = min(video 1 duration, 2.5 seconds) + min(video 2 duration, 2.5 seconds)`.

    **Billable duration of output video**: The duration in seconds of the video successfully generated by the model.
  </Tab>

  <Tab title="Wan 2.6 series models">
    **Billable duration of input video**: The maximum is 5 seconds. `Truncation limit per video = 5 seconds / Total number of reference materials (reference images + reference videos, excluding the first frame image)`. Each video is billed based on `min(actual duration, truncation limit)`. The billable durations for multiple videos are added together.

| **Number of reference materials** | **Truncation limit per video** |
| --------------------------------- | ------------------------------ |
| 1                                 | 5s                             |
| 2                                 | 2.5s                           |
| 3                                 | 1.65s                          |
| 4                                 | 1.25s                          |
| 5                                 | 1s                             |

    <Accordion title="More examples: Calculating the billable duration of input video">
      - **Input: 1 reference material (truncation limit per video: 5 seconds)**
        - If the input is a video: `Billable input duration = min(video duration, 5 seconds)`.
        - If the input is an image: Free of charge.

      - **Input: 2 reference materials (truncation limit per video: 2.5 seconds)**
        - If the input is 1 video + 1 image: `Billable input duration = min(video 1 duration, 2.5 seconds)`.
        - If the input is 2 videos: `Billable input duration = min(video 1 duration, 2.5 seconds) + min(video 2 duration, 2.5 seconds)`.

      - **Input: 3 reference materials (truncation limit per video: 1.65 seconds)**
        - If the input is 1 video + 2 images: `Billable input duration = min(video 1 duration, 1.65 seconds)`.
        - If the input is 3 videos: `Billable input duration = min(video 1 duration, 1.65 seconds) + min(video 2 duration, 1.65 seconds) + min(video 3 duration, 1.65 seconds)`.

      - **Input: 4 reference materials (truncation limit per video: 1.25 seconds)**
        - If the input is 2 videos + 2 images: `Billable input duration = min(video 1 duration, 1.25 seconds) + min(video 2 duration, 1.25 seconds)`.
        - If the input is 3 videos + 1 image: `Billable input duration = min(video 1 duration, 1.25 seconds) + min(video 2 duration, 1.25 seconds) + min(video 3 duration, 1.25 seconds)`.

      - **Input: 5 reference materials (truncation limit per video: 1 second)**
        - If the input is 1 video + 4 images: `Billable input duration = min(video 1 duration, 1 second)`.
        - If the input is 3 videos + 2 images: `Billable input duration = min(video 1 duration, 1 second) + min(video 2 duration, 1 second) + min(video 3 duration, 1 second)`.
    </Accordion>

    **Billable duration of output video**: The duration in seconds of the video successfully generated by the model.
  </Tab>
</Tabs>

## API reference

- [wan2.7 reference-to-video API reference](/api-reference/video-generation/wan27-reference-to-video/create-task)
- [wan2.6 reference-to-video API reference](/api-reference/video-generation/wan-reference-to-video/create-task)

## FAQ

### How do I reference materials in a prompt?

The reference method depends on the model and feature used:

- Reference images are identified as **Image 1**, **Image 2**, and so on. Reference videos are identified as **Video 1**, **Video 2**, and so on.
- Images and videos are counted separately. The order matches the order of the same type of material in the `media` array.
- If you have only one reference image or video, you can simplify the identifier to "reference image" or "reference video".
- Usually, you do not need to reference the first frame image in the prompt.

```json
{
    "input": {
        "prompt": "Video 1 is playing the guitar, and Image 1 is holding a bouquet of flowers and walks past Video 1.",
        "media": [
            {
                "type": "first_frame",
                "url":  "https://example.com/scene.jpg"
            },
            {
                "type": "reference_video",
                "url":  "https://example.com/girl.mp4"
            },
            {
                "type": "reference_image",
                "url": "https://example.com/boy.png"
            }
        ]
    }
}
```

### Can reference\_voice be used with a first frame image?

**This is not recommended**. Use `media.reference_voice` with `reference_image` or `reference_video` to specify the timbre for the corresponding entity.
