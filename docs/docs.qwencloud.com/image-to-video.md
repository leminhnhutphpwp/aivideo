> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Image-to-video: first frame

> Animate from a single image

- **Basic settings**: Choose a duration and resolution based on the model (see [Video generation models](/developer-guides/getting-started/video-models#all-models)). wan2.7 and wan2.6 support any integer from 2 to 15 seconds, while wan2.5 supports only 5 or 10 seconds. The model also supports prompt rewriting and adding watermarks.
- **Audio capabilities**: Supports automatic dubbing or uploading audio to achieve audio-video sync. **(Supported by wan2.5 and later)**
- **Multi-shot narrative**: Generate videos with multiple shots while keeping the main subject consistent across shots. **(Supported by wan2.6 and wan2.7)**

**Quick links:** [Try it online](https://home.qwencloud.com/try-ai) **|** API reference: [wan2.7](/api-reference/video-generation/wan27-image-to-video/create-task), [wan2.6](/api-reference/video-generation/wan-image-to-video-first-frame/create-task)

## Getting started

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Input first frame**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Output video (multi-shot video with audio)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      The camera slowly moves up from below the sea turtle. The turtle swims leisurely, and the details of its belly are clearly visible.
    </td>

    <td style={{verticalAlign: "top"}}>
      ![wan-i2v-haigui](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/3937619671/p1047607.webp)
    </td>

    <td style={{verticalAlign: "top"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20260121/oiiigs/wan-i2v-haigui-video.mp4" controls />
    </td>
  </tr>
</table>

Before calling the API, [get an API key](/api-reference/preparation/api-key) and [set the API key as an environment variable](/api-reference/preparation/export-api-key-env). To use a SDK, [install the DashScope SDK](/api-reference/preparation/install-sdk).

<Tabs>
  <Tab title="curl (wan2.7)">
    <Note>
      Wan 2.7 uses a `media` array to provide the first frame image. It uses `resolution` instead of pixel dimensions, and describes multi-shot directly in the prompt.
    </Note>

    ```bash
    # Step 1: Create a task to obtain the task ID
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.7-i2v",
      "input": {
        "prompt": "The camera slowly moves up from below the sea turtle. The turtle swims leisurely, and the details of its belly are clearly visible.",
        "media": [
          {
            "type": "first_frame",
            "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260121/zlpocv/wan-i2v-haigui.webp"
          }
        ]
      },
      "parameters": {
        "resolution": "1080P",
        "prompt_extend": true,
        "duration": 10
      }
    }'

    # Step 2: Retrieve the result using the task ID
    # Replace {task_id} with the task_id value returned by the previous API call
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>

  <Tab title="curl (wan2.6)">
    ```bash
    # Step 1: Create a task to obtain the task ID
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.6-i2v-flash",
      "input": {
        "prompt": "The camera slowly moves up from below the sea turtle. The turtle swims leisurely, and the details of its belly are clearly visible.",
        "img_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260121/zlpocv/wan-i2v-haigui.webp"
      },
      "parameters": {
        "resolution": "720P",
        "prompt_extend": true,
        "watermark": true,
        "duration": 10,
        "shot_type":"multi"
      }
    }'

    # Step 2: Retrieve the result using the task ID
    # Replace {task_id} with the task_id value returned by the previous API call
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

<Note>
  **SDK version requirements:**

  - DashScope Python SDK: **1.25.8 or later**
  - DashScope Java SDK: **2.22.6 or later**

  If your SDK version is too old, you might encounter errors such as "url error, please check url!". [Install the SDK](/api-reference/preparation/install-sdk).
</Note>

<Accordion title="Python and Java SDK examples (wan2.6)">
  <CodeGroup>
    ```python Python SDK
    import os
    from http import HTTPStatus
    from dashscope import VideoSynthesis
    import dashscope

    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'
    api_key = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")

    print('please wait...')
    rsp = VideoSynthesis.call(api_key=api_key,
                              model='wan2.6-i2v-flash',
                              prompt='The camera slowly moves up from below the sea turtle. The turtle swims leisurely, and the details of its belly are clearly visible.',
                              img_url="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260121/zlpocv/wan-i2v-haigui.webp",
                              resolution="720P",
                              duration=10,
                              shot_type="multi",
                              prompt_extend=True,
                              watermark=True)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print("video_url:", rsp.output.video_url)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))
    ```

    ```java Java SDK
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.JsonUtils;
    import com.alibaba.dashscope.utils.Constants;

    public class Image2Video {

      static {
        Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
      }

      // If you have not configured the environment variable, replace the following line with your API key: apiKey="sk-xxx"
      static String apiKey = System.getenv("DASHSCOPE_API_KEY");

      public static void image2video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
        VideoSynthesisParam param =
            VideoSynthesisParam.builder()
                .apiKey(apiKey)
                .model("wan2.6-i2v-flash")
                .prompt("The camera slowly moves up from below the sea turtle. The turtle swims leisurely, and the details of its belly are clearly visible.")
                .imgUrl("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260121/zlpocv/wan-i2v-haigui.webp")
                .duration(10)
                .resolution("720P")
                .shotType("multi")
                .promptExtend(true)
                .watermark(true)
                .build();
        System.out.println("please wait...");
        VideoSynthesisResult result = vs.call(param);
        System.out.println(JsonUtils.toJson(result));
      }

      public static void main(String[] args) {
        try {
          image2video();
        } catch (ApiException | NoApiKeyException | InputRequiredException e) {
          System.out.println(e.getMessage());
        }
        System.exit(0);
      }
    }
    ```

    ```bash curl
    # Step 1: Create a task to obtain the task ID
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.6-i2v-flash",
      "input": {
        "prompt": "The camera slowly moves up from below the sea turtle. The turtle swims leisurely, and the details of its belly are clearly visible.",
        "img_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260121/zlpocv/wan-i2v-haigui.webp"
      },
      "parameters": {
        "resolution": "720P",
        "prompt_extend": true,
        "watermark": true,
        "duration": 10,
        "shot_type":"multi"
      }
    }'

    # Step 2: Retrieve the result using the task ID
    # Replace {task_id} with the task_id value returned by the previous API call
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </CodeGroup>
</Accordion>

## Core features

### Create multi-shot videos

**Models**: `wan2.7-i2v`, `wan2.7-i2v-2026-04-25`, `wan2.6-i2v-flash`, `wan2.6-i2v`.

**Introduction**: Automatically switches shots, such as from a wide shot to a close-up. This feature is suitable for creating MVs and other scenarios.

**Parameter settings**:

- **wan2.7**: Describe shots directly in the prompt text (e.g., `Shot 1 [0-3 s]: ...`). No `shot_type` parameter needed.
- **wan2.6**: Set `shot_type` to `"multi"`.
- `prompt_extend`: Must be `true` to enable intelligent rewriting for optimized shot descriptions.

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Input first frame**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Output video (wan2.6, multi-shot video)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He performs an English rap at high speed while striking a classic, energetic rapper pose. The scene is set at night under an urban railway bridge. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.
    </td>

    <td style={{verticalAlign: "top"}}>
      ![rap](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/1682878571/p1011609.webp) <strong>Input audio</strong>: <audio style={{width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250925/taxesr/rap.mp3" controls />
    </td>

    <td style={{verticalAlign: "top"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20251215/ofaaah/wan2.6.mp4" controls />
    </td>
  </tr>
</table>

<Note>
  Make sure that your DashScope SDK version is up to date:

  - Python SDK: `1.25.8` or later
  - Java SDK: `2.22.6` or later

  [Install the SDK](/api-reference/preparation/install-sdk).
</Note>

<CodeGroup>
  ```python Python SDK
  import os
  from http import HTTPStatus
  from dashscope import VideoSynthesis
  import dashscope

  dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

  # If you have not configured the environment variable, replace the following line with your API key: api_key="sk-xxx"
  api_key = os.getenv("DASHSCOPE_API_KEY")

  def sample_async_call_i2v():
    # Asynchronous call, returns a task_id
    rsp = VideoSynthesis.async_call(api_key=api_key,
                    model='wan2.6-i2v-flash',
                    prompt='A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He performs an English rap at high speed while striking a classic, energetic rapper pose. The scene is set at night under an urban railway bridge. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.',
                    img_url="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png",
                    audio_url="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3",
                    resolution="720P",
                    duration=10,
                    shot_type="multi", # Multi-shot
                    prompt_extend=True,
                    watermark=True,
                    negative_prompt="",
                    seed=12345)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print("task_id: %s" % rsp.output.task_id)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

    # Wait for the asynchronous task to complete
    rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print(rsp.output.video_url)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

  if __name__ == '__main__':
    sample_async_call_i2v()
  ```

  ```java Java SDK
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
  import com.alibaba.dashscope.exception.ApiException;
  import com.alibaba.dashscope.exception.InputRequiredException;
  import com.alibaba.dashscope.exception.NoApiKeyException;
  import com.alibaba.dashscope.utils.JsonUtils;
  import com.alibaba.dashscope.utils.Constants;

  public class Image2Video {
    static {
      Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
    }

    // If you have not configured the environment variable, replace the following line with your API key: apiKey="sk-xxx"
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    //Set the input image URL
    static String imgUrl = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png";
    // Set the audio URL
    static String audioUrl = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3";

    public static void image2video() throws ApiException, NoApiKeyException, InputRequiredException {
      VideoSynthesis vs = new VideoSynthesis();
      VideoSynthesisParam param =
          VideoSynthesisParam.builder()
              .apiKey(apiKey)
              .model("wan2.6-i2v-flash")
              .prompt("A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He performs an English rap at high speed while striking a classic, energetic rapper pose. The scene is set at night under an urban railway bridge. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.")
              .imgUrl(imgUrl)
              .audioUrl(audioUrl)
              .shotType("multi")
              .duration(10)
              .resolution("720P")
              .negativePrompt("")
              .promptExtend(true)
              .watermark(true)
              .seed(12345)
              .build();
      // Asynchronous call
      VideoSynthesisResult task = vs.asyncCall(param);
      System.out.println(JsonUtils.toJson(task));
      System.out.println("please wait...");

      //Get the result
      VideoSynthesisResult result = vs.wait(task, apiKey);
      System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
      try {
        image2video();
      } catch (ApiException | NoApiKeyException | InputRequiredException e) {
        System.out.println(e.getMessage());
      }
      System.exit(0);
    }
  }
  ```

  ```bash curl
  # Step 1: Create a task to obtain the task ID
  curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    -H 'X-DashScope-Async: enable' \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
    "model": "wan2.6-i2v-flash",
    "input": {
      "prompt": "A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life from a concrete wall. He raps an English song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.",
      "img_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png",
      "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3"
    },
    "parameters": {
      "resolution": "720P",
      "prompt_extend": true,
      "duration": 10,
      "shot_type":"multi"
    }
  }'

  # Step 2: Retrieve the result using the task ID
  # Replace {task_id} with the task_id value returned by the previous API call
  curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
  --header "Authorization: Bearer $DASHSCOPE_API_KEY"
  ```
</CodeGroup>

### Audio-video synchronization

**Models**: `wan2.7-i2v`, `wan2.7-i2v-2026-04-25`, `wan2.6-i2v-flash`, `wan2.6-i2v`, `wan2.5-i2v-preview`.

<Note>
  **wan2.7**: Use the `media` array with a `driving_audio` type to provide audio for lip-sync. If omitted, the model auto-generates sound effects. See the [wan2.7 API reference](/api-reference/video-generation/wan27-image-to-video/create-task) for details.
</Note>

**Introduction**: Animates characters in photos to speak or sing, with lip movements that match the audio. For more examples, see [Sound generation](/developer-guides/accuracy-tuning/video-generation).

**Parameter settings:**

- **Provide an audio file**: Pass the `audio_url`. The model will align the lip movements based on the audio file.
- **Automatic dubbing**: Do not pass an `audio_url`. The model outputs a video with audio by default. It automatically generates background sound effects, music, or vocals based on the visuals.

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Input first frame**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Output video (with audio)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He performs an English rap at high speed while striking a classic, energetic rapper pose. The scene is set at night under an urban railway bridge. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.
    </td>

    <td style={{verticalAlign: "top"}}>
      ![rap](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/1682878571/p1011609.webp) <strong>Input audio</strong>: <audio style={{width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250925/taxesr/rap.mp3" controls />
    </td>

    <td style={{verticalAlign: "top"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250925/yfwbhx/%E8%8B%B1%E6%96%87rap+%281%29.mp4" controls />
    </td>
  </tr>
</table>

<Note>
  Make sure that your DashScope SDK version is up to date:

  - Python SDK: `1.25.8` or later
  - Java SDK: `2.22.6` or later

  [Install the SDK](/api-reference/preparation/install-sdk).
</Note>

<CodeGroup>
  ```python Python SDK
  import os
  from http import HTTPStatus
  from dashscope import VideoSynthesis
  import dashscope

  dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

  # If you have not configured the environment variable, replace the following line with your API key: api_key="sk-xxx"
  api_key = os.getenv("DASHSCOPE_API_KEY")

  def sample_async_call_i2v():
    # Asynchronous call, returns a task_id
    rsp = VideoSynthesis.async_call(api_key=api_key,
                    model='wan2.6-i2v-flash',
                    prompt='A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He performs an English rap at high speed while striking a classic, energetic rapper pose. The scene is set at night under an urban railway bridge. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.',
                    img_url="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png",
                    audio_url="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3",
                    resolution="720P",
                    duration=10,
                    prompt_extend=True,
                    watermark=True,
                    negative_prompt="",
                    seed=12345)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print("task_id: %s" % rsp.output.task_id)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

    # Wait for the asynchronous task to complete
    rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print(rsp.output.video_url)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

  if __name__ == '__main__':
    sample_async_call_i2v()
  ```

  ```java Java SDK
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
  import com.alibaba.dashscope.exception.ApiException;
  import com.alibaba.dashscope.exception.InputRequiredException;
  import com.alibaba.dashscope.exception.NoApiKeyException;
  import com.alibaba.dashscope.utils.JsonUtils;
  import com.alibaba.dashscope.utils.Constants;

  public class Image2Video {
    static {
      Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
    }

    // If you have not configured the environment variable, replace the following line with your API key: apiKey="sk-xxx"
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    //Set the input image URL
    static String imgUrl = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png";
    // Set the audio URL
    static String audioUrl = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3";

    public static void image2video() throws ApiException, NoApiKeyException, InputRequiredException {
      VideoSynthesis vs = new VideoSynthesis();
      VideoSynthesisParam param =
          VideoSynthesisParam.builder()
              .apiKey(apiKey)
              .model("wan2.6-i2v-flash")
              .prompt("A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He performs an English rap at high speed while striking a classic, energetic rapper pose. The scene is set at night under an urban railway bridge. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.")
              .imgUrl(imgUrl)
              .audioUrl(audioUrl)
              .duration(10)
              .resolution("720P")
              .negativePrompt("")
              .promptExtend(true)
              .watermark(true)
              .seed(12345)
              .build();
      // Asynchronous call
      VideoSynthesisResult task = vs.asyncCall(param);
      System.out.println(JsonUtils.toJson(task));
      System.out.println("please wait...");

      //Get the result
      VideoSynthesisResult result = vs.wait(task, apiKey);
      System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
      try {
        image2video();
      } catch (ApiException | NoApiKeyException | InputRequiredException e) {
        System.out.println(e.getMessage());
      }
      System.exit(0);
    }
  }
  ```
</CodeGroup>

**curl**

**Step 1: Create a task to obtain the task ID**

<Tabs>
  <Tab title="Provide an audio file">
    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.5-i2v-preview",
      "input": {
        "prompt": "A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life from a concrete wall. He raps an English song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.",
        "img_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png",
        "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3"
      },
      "parameters": {
        "resolution": "480P",
        "prompt_extend": true,
        "duration": 10
      }
    }'
    ```
  </Tab>

  <Tab title="Automatic dubbing">
    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.5-i2v-preview",
      "input": {
        "prompt": "A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life from a concrete wall. He raps an English song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.",
        "img_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png"
      },
      "parameters": {
        "resolution": "480P",
        "prompt_extend": true,
        "duration": 10
      }
    }'
    ```
  </Tab>
</Tabs>

**Step 2: Retrieve the result using the task ID**

Replace `{task_id}` with the `task_id` value returned by the previous API call.

```bash
curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
--header "Authorization: Bearer $DASHSCOPE_API_KEY"
```

### Generate videos without audio

**Models**: `wan2.6-i2v-flash`, `wan2.2 and earlier models`.

**Introduction**: Suitable for visual-only scenarios that do not require audio, such as dynamic posters and silent short videos.

**Parameter settings**:

- `wan2.6-i2v-flash`: By default, this model generates a video with audio. To generate a video without audio, you must explicitly set `audio=false`. Even if you pass an `audio_url`, the output is a silent video as long as `audio=false`. For pricing details, see [wan2.6-i2v-flash pricing](https://www.qwencloud.com/models/wan2.6-i2v-flash).
- `wan2.2 and earlier models`: These models generate silent videos by default, with no extra configuration needed.

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Prompt**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Input first frame**</th>
    <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>**Output video (without audio)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      A cat running on the grass
    </td>

    <td style={{verticalAlign: "top"}}>
      ![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2102998671/p1007038.png)
    </td>

    <td style={{verticalAlign: "top"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250418/oyxuch/29a2e615-6443-4647-bbe2-e26f345a3b26.mp4" controls />
    </td>
  </tr>
</table>

<Note>
  Make sure that your DashScope SDK version is up to date:

  - Python SDK: `1.25.8` or later
  - Java SDK: `2.22.6` or later

  [Install the SDK](/api-reference/preparation/install-sdk).
</Note>

<CodeGroup>
  ```python Python SDK
  import os
  from http import HTTPStatus
  from dashscope import VideoSynthesis
  import dashscope

  dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

  # If you have not configured the environment variable, replace the following line with your API key: api_key="sk-xxx"
  api_key = os.getenv("DASHSCOPE_API_KEY")

  def sample_async_call_i2v():
    # Asynchronous call, returns a task_id
    rsp = VideoSynthesis.async_call(api_key=api_key,
                    model='wan2.6-i2v-flash',
                    prompt='A cat running on the grass',
                    img_url="https://cdn.translate.alibaba.com/r/wanx-demo-1.png",
                    audio=False,   # Must be explicitly set to False to output a video without audio
                    resolution="720P",
                    duration=5,
                    prompt_extend=True,
                    watermark=True,
                    negative_prompt="",
                    seed=12345)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print("task_id: %s" % rsp.output.task_id)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

    # Wait for the asynchronous task to complete
    rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print(rsp.output.video_url)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

  if __name__ == '__main__':
    sample_async_call_i2v()
  ```

  ```java Java SDK
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
  import com.alibaba.dashscope.exception.ApiException;
  import com.alibaba.dashscope.exception.InputRequiredException;
  import com.alibaba.dashscope.exception.NoApiKeyException;
  import com.alibaba.dashscope.utils.JsonUtils;
  import com.alibaba.dashscope.utils.Constants;

  public class Image2Video {
    static {
      Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
    }

    // If you have not configured the environment variable, replace the following line with your API key: apiKey="sk-xxx"
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void image2video() throws ApiException, NoApiKeyException, InputRequiredException {
      VideoSynthesis vs = new VideoSynthesis();
      VideoSynthesisParam param =
          VideoSynthesisParam.builder()
              .apiKey(apiKey)
              .model("wan2.6-i2v-flash")
              .prompt("A cat running on the grass")
              .imgUrl("https://cdn.translate.alibaba.com/r/wanx-demo-1.png")
              .audio(false)   /*Must be explicitly set to false to output a video without audio*/
              .duration(10)
              .resolution("720P")
              .negativePrompt("")
              .promptExtend(true)
              .watermark(true)
              .seed(12345)
              .build();
      // Asynchronous call
      VideoSynthesisResult task = vs.asyncCall(param);
      System.out.println(JsonUtils.toJson(task));
      System.out.println("please wait...");

      //Get the result
      VideoSynthesisResult result = vs.wait(task, apiKey);
      System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
      try {
        image2video();
      } catch (ApiException | NoApiKeyException | InputRequiredException e) {
        System.out.println(e.getMessage());
      }
      System.exit(0);
    }
  }
  ```
</CodeGroup>

**curl**

**Step 1: Create a task to obtain the task ID**

<Tabs>
  <Tab title="wan2.6-i2v-flash">
    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.6-i2v-flash",
      "input": {
        "prompt": "A cat running on the grass",
        "img_url": "https://cdn.translate.alibaba.com/r/wanx-demo-1.png"
      },
      "parameters": {
        "audio": false,
        "resolution": "720P",
        "prompt_extend": true,
        "watermark": true,
        "duration": 5
      }
    }'
    ```
  </Tab>

  <Tab title="wan2.2 and earlier models">
    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.2-i2v-plus",
      "input": {
        "prompt": "A cat running on the grass",
        "img_url": "https://cdn.translate.alibaba.com/r/wanx-demo-1.png"
      },
      "parameters": {
        "resolution": "480P",
        "prompt_extend": true
      }
    }'
    ```
  </Tab>
</Tabs>

**Step 2: Retrieve the result using the task ID**

Replace `{task_id}` with the `task_id` value returned by the previous API call.

```bash
curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
--header "Authorization: Bearer $DASHSCOPE_API_KEY"
```

## How to provide images and audio

### Input image

- **Number**: 1.
- **Input methods**: Public image URL, local file path, or Base64-encoded string.

<Accordion title="Method 1: Public URL (HTTP interface, SDK) - Recommended">
  * **Requirements**: Supports the HTTP or HTTPS protocol. Ensure that the image URL is directly accessible from the internet.
  * **Example**: "[https://example.com/img.png](https://example.com/img.png)"
</Accordion>

<Accordion title="Method 2: Local file path (SDK only)">
  The file path requirements differ slightly for Python and Java. On Windows: Python uses two slashes (`file://`), while Java uses three (`file:///`). Follow the rules below carefully.

  **Python SDK**: Supports **absolute and relative paths**. The file path rules are as follows:

| **Operating system** | **Input File Path**                   | **Example (absolute path)**    | **Example (relative path)** |
| -------------------- | ------------------------------------- | ------------------------------ | --------------------------- |
| Linux / macOS        | `file://` + absolute or relative path | `file:///home/images/test.png` | `file://./images/test.png`  |
| Windows              | `file://` + absolute or relative path | `file://D:/images/test.png`    | `file://./images/test.png`  |

  **Java SDK**: Supports **absolute paths** only. The file path rules are as follows:

| **Operating system** | **Input file path**        | **Example (absolute path)**    |
| -------------------- | -------------------------- | ------------------------------ |
| Linux / macOS        | `file://` + absolute path  | `file:///home/images/test.png` |
| Windows              | `file:///` + absolute path | `file:///D:/images/test.png`   |
</Accordion>

<Accordion title="Method 3: Base64-encoded string (HTTP interface, SDK)">
  - **Example**: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABDg......` (The example is truncated for demonstration purposes only).
  - **Format requirement**: Follow the `data:<MIME_type>;base64,<base64_data>` format, where:
    - `<base64_data>`: The Base64-encoded string of the image file.
    - `<MIME_type>`: The media type of the image, which must correspond to the file format.

| **Image format** | **MIME type** |
| ---------------- | ------------- |
| JPEG             | image/jpeg    |
| JPG              | image/jpeg    |
| PNG              | image/png     |
| BMP              | image/bmp     |
| WEBP             | image/webp    |
</Accordion>

#### Example code: Three input methods

<CodeGroup>
  ```python Python SDK
  import base64
  import os
  from http import HTTPStatus
  from dashscope import VideoSynthesis
  import mimetypes
  import dashscope

  dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

  # If you haven't configured the environment variable, replace the next line with your API key: api_key="sk-xxx"
  api_key = os.getenv("DASHSCOPE_API_KEY")

  # --- Helper function: For Base64 encoding ---
  # Format: data:{MIME_type};base64,{base64_data}
  def encode_file(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
      raise ValueError("Unsupported or unrecognized image format")
    with open(file_path, "rb") as image_file:
      encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    return f"data:{mime_type};base64,{encoded_string}"

  """
  Image input methods:
  Choose one of the following three methods:

  1. Use a public URL - Suitable for publicly accessible images
  2. Use a local file - Suitable for local development and testing
  3. Use Base64 encoding - Suitable for private images or scenarios requiring encrypted transmission
  """

  # [Method 1] Use a publicly accessible image URL
  # Example: Use a public image URL
  img_url = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png"

  # [Method 2] Use a local file (supports absolute and relative paths)
  # Format requirement: file:// + file path
  # Example (absolute path):
  # img_url = "file://" + "/path/to/your/img.png"    # Linux/macOS
  # img_url = "file://" + "/C:/path/to/your/img.png"  # Windows
  # Example (relative path):
  # img_url = "file://" + "./img.png"                # Relative to the current executable file's path

  # [Method 3] Use a Base64-encoded image
  # img_url = encode_file("./img.png")

  # Set audio URL
  audio_url = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3"

  def sample_call_i2v():
    # Synchronous call, returns result directly
    print('please wait...')
    rsp = VideoSynthesis.call(api_key=api_key,
                                model='wan2.6-i2v-flash',
                                prompt='A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life from a concrete wall. He raps an English song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.',
                                img_url=img_url,
                                audio_url=audio_url,
                                resolution="720P",
                                duration=10,
                                prompt_extend=True,
                                watermark=False,
                                negative_prompt="",
                                seed=12345)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
      print("video_url:", rsp.output.video_url)
    else:
      print('Failed, status_code: %s, code: %s, message: %s' %
                (rsp.status_code, rsp.code, rsp.message))

  if __name__ == '__main__':
    sample_call_i2v()
  ```

  ```java Java SDK
  // Copyright (c) Alibaba, Inc. and its affiliates.

  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
  import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
  import com.alibaba.dashscope.exception.ApiException;
  import com.alibaba.dashscope.exception.InputRequiredException;
  import com.alibaba.dashscope.exception.NoApiKeyException;
  import com.alibaba.dashscope.utils.JsonUtils;
  import com.alibaba.dashscope.utils.Constants;

  import java.io.IOException;
  import java.nio.file.Files;
  import java.nio.file.Path;
  import java.nio.file.Paths;
  import java.util.Base64;
  import java.util.HashMap;
  import java.util.Map;

  public class Image2Video {

    static {
      Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
    }

    // If you haven't configured the environment variable, replace the next line with your API key: apiKey="sk-xxx"
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    /**
       * Image input methods: Choose one of the following three
       *
       * 1. Use a public URL - Suitable for publicly accessible images
       * 2. Use a local file - Suitable for local development and testing
       * 3. Use Base64 encoding - Suitable for private images or scenarios requiring encrypted transmission
       */

    // [Method 1] Public URL
    static String imgUrl = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png";

    // [Method 2] Local file path (file://+absolute path)
    // static String imgUrl = "file://" + "/your/path/to/img.png";    // Linux/macOS
    // static String imgUrl = "file://" + "/C:/your/path/to/img.png";  // Windows

    // [Method 3] Base64 encoding
    // static String imgUrl = Image2Video.encodeFile("/your/path/to/img.png");

    // Set audio URL
    static String audioUrl = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3";

    public static void image2video() throws ApiException, NoApiKeyException, InputRequiredException {
      // Set parameters
      Map<String, Object> parameters = new HashMap<>();
      parameters.put("prompt_extend", true);
      parameters.put("watermark", false);
      parameters.put("seed", 12345);

      VideoSynthesis vs = new VideoSynthesis();
      VideoSynthesisParam param =
          VideoSynthesisParam.builder()
              .apiKey(apiKey)
              .model("wan2.6-i2v-flash")
              .prompt("A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life from a concrete wall. He raps an English song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The lighting comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.")
              .imgUrl(imgUrl)
              .audioUrl(audioUrl)
              .duration(10)
              .parameters(parameters)
              .resolution("720P")
              .negativePrompt("")
              .build();
      System.out.println("please wait...");
      VideoSynthesisResult result = vs.call(param);
      System.out.println(JsonUtils.toJson(result));
    }

       /**
       * Encode a file into a Base64 string
       * @param filePath File path
       * @return Base64 string in the format: data:{MIME_type};base64,{base64_data}
       */
    public static String encodeFile(String filePath) {
      Path path = Paths.get(filePath);
      if (!Files.exists(path)) {
        throw new IllegalArgumentException("File does not exist: " + filePath);
      }
      // Detect MIME type
      String mimeType = null;
      try {
        mimeType = Files.probeContentType(path);
      } catch (IOException e) {
        throw new IllegalArgumentException("Cannot detect file type: " + filePath);
      }
      if (mimeType == null || !mimeType.startsWith("image/")) {
        throw new IllegalArgumentException("Unsupported or unrecognized image format");
      }
      // Read file content and encode
      byte[] fileBytes = null;
      try{
        fileBytes = Files.readAllBytes(path);
      } catch (IOException e) {
        throw new IllegalArgumentException("Cannot read file content: " + filePath);
      }

      String encodedString = Base64.getEncoder().encodeToString(fileBytes);
      return "data:" + mimeType + ";base64," + encodedString;
    }

    public static void main(String[] args) {
      try {
        image2video();
      } catch (ApiException | NoApiKeyException | InputRequiredException e) {
        System.out.println(e.getMessage());
      }
      System.exit(0);
    }
  }
  ```
</CodeGroup>

### Input audio

- **Number**: 1.
- **Input method**: Only **publicly accessible URLs** (HTTP or HTTPS) are supported—local file paths and Base64 encoding are not supported.
- **Audio file constraints**:
  - Format: wav, mp3
  - Duration: 3–30 seconds
  - File size: Up to 15 MB
  - If the audio exceeds the video duration, it is truncated. If the audio is shorter, the remaining video is silent.

## Output video

- **Number**: 1.
- **Output video specifications**: Output specifications vary by model, see [Video generation models](/developer-guides/getting-started/video-models#all-models).
- **Output video URL validity**: **24 hours**.
- **Output video dimensions**: The dimensions are determined by the input image and the `resolution` setting.
  - The model tries to maintain the aspect ratio of the input image while scaling it to a total pixel count close to the target value. Because of encoding standards, the width and height must be divisible by 16, so the model automatically adjusts the dimensions slightly.
  - For example, if the input image is 750 x 1000 (aspect ratio 3:4 = 0.75) and you set resolution = "720P" (target pixel count is about 920,000), the final output might be 816 x 1104 (aspect ratio approximately 0.739, total pixels approximately 900,000), where both width and height are multiples of 16.

## Billing and rate limits

- For the free quota and unit price, see [Model pricing](/developer-guides/getting-started/pricing).
- For rate limits, see [Wan series](/developer-guides/administration/rate-limits).
- Billing details:
  - Billing is based on the **duration in seconds** of the successfully generated video.
  - Failed model calls or processing errors do not incur fees or consume the [free quota for new users](/resources/free-quota).

## API reference

- [Wan 2.7 image-to-video API reference](/api-reference/video-generation/wan27-image-to-video/create-task)
- [Wan 2.6 image-to-video (first frame) API reference](/api-reference/video-generation/wan-image-to-video-first-frame/create-task)

## FAQ

### Why can't I directly set the video aspect ratio (such as 16:9)?

The current API does not support directly specifying the video aspect ratio. You can only set the video's resolution using the `resolution` parameter.

The `resolution` parameter controls the total number of pixels in the video, not a fixed ratio. The model prioritizes preserving the original aspect ratio of the initial input image and makes minor adjustments to meet video encoding requirements. Both width and height must be multiples of 16.

### SDK error: "url error, please check url!"

Make sure that:

- Your DashScope Python SDK version is `1.25.8` or later.
- Your DashScope Java SDK version is `2.22.6` or later.

If your SDK version is too old, you might encounter the "url error, please check url!" error. For more information about upgrading the SDK, see [Upgrade the SDK](/api-reference/preparation/install-sdk).
