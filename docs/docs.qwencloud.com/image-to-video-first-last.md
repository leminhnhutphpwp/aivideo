> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Image-to-video: first and last frames

> Animate between two frames

- **Video specifications**: Custom video resolution (720P/1080P for wan2.7; 480P/720P/1080P for wan2.2). Duration: 2-15s for wan2.7, fixed 5s for wan2.2.
- **Audio capabilities**: wan2.7 supports automatic dubbing and custom audio for audio-video sync.
- **Additional capabilities**: Prompt rewriting and watermarking.

**Quick links:** API reference: [wan2.7](/api-reference/video-generation/wan27-image-to-video/create-task), [wan2.2](/api-reference/video-generation/wan-image-to-video-first-last-frames/create-task) | [Prompt guide](/developer-guides/accuracy-tuning/video-generation)

## Getting started

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Prompt**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**First frame**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Last frame**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Output video**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      A cute blue monster with a slightly sad expression stands in the rain. The camera slowly zooms in and stops on the moment it looks up at the sky.
    </td>

    <td style={{verticalAlign: "top"}}>
      ![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/7108770771/p958738.png)
    </td>

    <td style={{verticalAlign: "top"}}>
      ![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/7108770771/p1049069.png)
    </td>

    <td style={{verticalAlign: "top"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20260126/hpzamh/wan-kf2v-demo.mp4" controls title="Image-to-video: first and last frames" />
    </td>
  </tr>
</table>

Before calling the API, [get an API key](/api-reference/preparation/api-key). Then [set your API key as an environment variable](/api-reference/preparation/export-api-key-env).

<Tabs>
  <Tab title="curl (wan2.7)">
    Wan 2.7 uses the same `wan2.7-i2v` model as first-frame image-to-video. Provide both `first_frame` and `last_frame` in the `media` array.

    **Step 1: Create a task**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.7-i2v",
      "input": {
        "prompt": "Realistic style, a small black cat looks up at the sky curiously. The camera angle gradually rises from eye level, finally capturing its curious gaze from a top-down view.",
        "media": [
          {
            "type": "first_frame",
            "url": "https://wanx.alicdn.com/material/20250318/first_frame.png"
          },
          {
            "type": "last_frame",
            "url": "https://wanx.alicdn.com/material/20250318/last_frame.png"
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

    **Step 2: Get the result using the task ID**

    Replace `{task_id}` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```

    <Note>
      **Key differences from wan2.2**: wan2.7 uses `resolution` (720P/1080P) instead of pixel dimensions, supports 2-15s duration (not fixed at 5s), and uses the `media` array instead of `first_frame_url`/`last_frame_url` parameters. `watermark` defaults to `false`.
    </Note>
  </Tab>

  <Tab title="curl (wan2.2)">
    **Step 1: Create a task to get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.2-kf2v-flash",
      "input": {
        "first_frame_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260126/ixdxvt/wan-kf2v-blue-1.png",
        "last_frame_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260126/nhtdrc/wan-kf2v-blue-2.png",
        "prompt": "A cute blue monster with a slightly sad expression stands in the rain. The camera slowly zooms in and stops on the moment it looks up at the sky."
      },
      "parameters": {
        "resolution": "720P",
        "prompt_extend": true,
        "watermark": true
      }
    }'
    ```

    **Step 2: Get the result using the task ID**

    Replace `{task_id}` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

<Accordion title="Python and Java SDK examples (wan2.2)">
  To use the SDK, [install the DashScope SDK](/api-reference/preparation/install-sdk).

  <Tabs>
    <Tab title="Python SDK">
      <Warning>
        Make sure your DashScope Python SDK version is **at least** **`1.25.8`** before running the code below.

        If your version is too low, you may see errors such as "url error, please check url!". [Install the SDK](/api-reference/preparation/install-sdk).
      </Warning>

      ```python
      import os
      from http import HTTPStatus
      from dashscope import VideoSynthesis
      import dashscope

      dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'
      api_key = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")

      print('please wait...')
      rsp = VideoSynthesis.call(api_key=api_key,
                                  model="wan2.2-kf2v-flash",
                                  prompt="A cute blue monster with a slightly sad expression stands in the rain. The camera slowly zooms in and stops on the moment it looks up at the sky.",
                                  first_frame_url="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260126/ixdxvt/wan-kf2v-blue-1.png",
                                  last_frame_url="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260126/nhtdrc/wan-kf2v-blue-2.png",
                                  duration=5,  # Fixed at 5 seconds. Do not change.
                                  prompt_extend=True,
                                  watermark=True)
      print(rsp)
      if rsp.status_code == HTTPStatus.OK:
        print("video_url:", rsp.output.video_url)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))
      ```
    </Tab>

    <Tab title="Java SDK">
      <Warning>
        Make sure your DashScope Java SDK version is **at least** **`2.22.6`** before running the code below.

        If your version is too low, you may see errors such as "url error, please check url!". [Install the SDK](/api-reference/preparation/install-sdk).
      </Warning>

      ```java
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

        // If you have not set an environment variable, replace the line below with: apiKey="sk-xxx"
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        public static void image2video() throws ApiException, NoApiKeyException, InputRequiredException {
          VideoSynthesis vs = new VideoSynthesis();
          VideoSynthesisParam param =
              VideoSynthesisParam.builder()
                  .apiKey(apiKey)
                  .model("wan2.2-kf2v-flash")
                  .prompt("A cute blue monster with a slightly sad expression stands in the rain. The camera slowly zooms in and stops on the moment it looks up at the sky.")
                  .firstFrameUrl("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260126/ixdxvt/wan-kf2v-blue-1.png")
                  .lastFrameUrl("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260126/nhtdrc/wan-kf2v-blue-2.png")
                  .resolution("720P")
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
    </Tab>
  </Tabs>
</Accordion>

**Sample output**

<Note>
  `video_url` expires after 24 hours. Download the video promptly.
</Note>

```json
{
  "request_id": "c1209113-8437-424f-a386-xxxxxx",
  "output": {
    "task_id": "966cebcd-dedc-4962-af88-xxxxxx",
    "task_status": "SUCCEEDED",
    "video_url": "https://dashscope-result-sh.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
         ...
  },
  ...
}
```

## Core capabilities

**Description**: Generates smooth videos from a first-frame and a last-frame image.

### wan2.7-i2v parameters

Use the `media` array with `first_frame` and `last_frame` types. The same model and endpoint is used for both first-frame and first-last-frame generation.

- `input.prompt`: **Required**. Up to 5,000 characters.
- `input.media`: **Required**. Array containing one `first_frame` item and one `last_frame` item.
- `input.negative_prompt`: Optional. Up to 500 characters.
- `parameters.resolution`: Optional. `720P` or `1080P` (default: `1080P`).
- `parameters.duration`: Optional. 2-15 seconds (default: 5).
- `parameters.prompt_extend`: Optional. Default: `true`.
- `parameters.watermark`: Optional. Default: `false`.
- `parameters.seed`: Optional. 0 to 2147483647.

### wan2.2 / wan2.1 parameters

- `first_frame_url`: **Required**. URL of the first-frame image. The output video aspect ratio matches this image. Must be publicly accessible (HTTP or HTTPS). **Image requirements**: Format: JPEG, JPG, PNG (no alpha channel), BMP, WEBP. Resolution: 360-2000 pixels per side. Max file size: 10 MB.
- `last_frame_url`: **Required**. URL of the last-frame image. Must be publicly accessible (HTTP or HTTPS). Resolution may differ from the first frame; alignment is not required. **Image requirements**: Same as first-frame image.
- `prompt`: Optional but recommended. Text prompt describing the desired video content. Supports Chinese and English. Maximum 800 characters; excess is automatically truncated. If the subject or scene changes between frames, describe the transition (e.g., camera movement or subject movement).
- `negative_prompt`: Optional. Describes content you do NOT want in the video. Supports Chinese and English. Maximum 500 characters; excess is automatically truncated.
- `seed`: Optional. Random seed for reproducibility. Range: 0 to 2147483647. If omitted, a random seed is used. Results may still vary due to model randomness.

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Prompt**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**First frame**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Last frame**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Output video**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      Realistic style. A curious black kitten looks up at the sky. The camera starts at eye level and gradually rises until it captures the kitten's curious gaze from above.
    </td>

    <td style={{verticalAlign: "top"}}>
      ![First frame image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/1166661571/p944793.png)
    </td>

    <td style={{verticalAlign: "top"}}>
      ![Last frame image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/1166661571/p944794.png)
    </td>

    <td style={{verticalAlign: "top"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250704/qxiupv/24376238c6b4bc59486eeb7bb4012bfe3b329502da56ad7fc64e0b7a6746fd56.mp4" controls title="Image-to-video: first and last frames" />
    </td>
  </tr>
</table>

<Tabs>
  <Tab title="Python SDK">
    <Note>
      Make sure your DashScope Python SDK version is at least `1.25.8`. [Install the SDK](/api-reference/preparation/install-sdk).
    </Note>

    ```python
    import os
    from http import HTTPStatus
    from dashscope import VideoSynthesis
    import dashscope

    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'
    api_key = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")

    def sample_async_call_kf2v():
      # Asynchronous call returns a task_id
      rsp = VideoSynthesis.async_call(api_key=api_key,
                      model="wan2.2-kf2v-flash",
                      prompt="Realistic style. A curious black kitten looks up at the sky. The camera starts at eye level and gradually rises until it captures the kitten's curious gaze from above.",
                      first_frame_url="https://wanx.alicdn.com/material/20250318/first_frame.png",
                      last_frame_url="https://wanx.alicdn.com/material/20250318/last_frame.png",
                      duration=5,  # Fixed at 5 seconds. Do not change.
                      prompt_extend=True,
                      watermark=True)
      print(rsp)
      if rsp.status_code == HTTPStatus.OK:
        print("task_id: %s" % rsp.output.task_id)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

      # Wait for asynchronous task to complete
      rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
      print(rsp)
      if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

    if __name__ == '__main__':
      sample_async_call_kf2v()
    ```
  </Tab>

  <Tab title="Java SDK">
    <Note>
      Make sure your DashScope Java SDK version is at least `2.22.6`. [Install the SDK](/api-reference/preparation/install-sdk).
    </Note>

    ```java
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

      // If you have not set an environment variable, replace the line below with: apiKey="sk-xxx"
      static String apiKey = System.getenv("DASHSCOPE_API_KEY");

      public static void image2video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
        VideoSynthesisParam param =
            VideoSynthesisParam.builder()
                .apiKey(apiKey)
                .model("wan2.2-kf2v-flash")
                .prompt("Realistic style. A curious black kitten looks up at the sky. The camera starts at eye level and gradually rises until it captures the kitten's curious gaze from above.")
                .firstFrameUrl("https://wanx.alicdn.com/material/20250318/first_frame.png")
                .lastFrameUrl("https://wanx.alicdn.com/material/20250318/last_frame.png")
                .resolution("720P")
                .promptExtend(true)
                .watermark(true)
                .build();
        // Asynchronous call
        VideoSynthesisResult task = vs.asyncCall(param);
        System.out.println(JsonUtils.toJson(task));
        System.out.println("please wait...");

        // Get result
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
  </Tab>

  <Tab title="curl">
    **Step 1: Create a task to get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2video/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.2-kf2v-flash",
      "input": {
        "first_frame_url": "https://wanx.alicdn.com/material/20250318/first_frame.png",
        "last_frame_url": "https://wanx.alicdn.com/material/20250318/last_frame.png",
        "prompt": "Realistic style. A curious black kitten looks up at the sky. The camera starts at eye level and gradually rises until it captures the kitten's curious gaze from above."
      },
      "parameters": {
        "resolution": "720P",
        "prompt_extend": true,
        "watermark": true
      }
    }'
    ```

    **Step 2: Get the result using the task ID**

    Replace `{task_id}` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

## Input image

- **Number of images**: One first-frame image and one last-frame image.
- **Image format**: JPEG, JPG, PNG (no alpha channel), BMP, WEBP.
- **Image resolution**: 360-2000 pixels per side.
- **Max file size**: 10 MB per image.
- **Input methods**: Image URL, local file path.

<Accordion title="Method 1: Image URL (HTTP API and SDK) — Recommended">
  * **Public URL**: Supports HTTP or HTTPS. Example: `https://xxxx/xxx.png`.
</Accordion>

<Accordion title="Method 2: Local file path (SDK only)">
  Different programming languages (Python and Java) have different path requirements. Follow the rules below exactly.

  **Python SDK**: Supports **absolute and relative paths**. Path rules:

| **Operating system** | **Input file path**                 | **Example (absolute path)**  | **Example (relative path)** |
| -------------------- | ----------------------------------- | ---------------------------- | --------------------------- |
| Linux / macOS        | file://\{absolute or relative path} | file:///home/images/test.png | file://./images/test.png    |
| Windows              | file://\{absolute or relative path} | file://D:/images/test.png    | file://./images/test.png    |

  **Java SDK**: Supports **absolute paths only**. Path rules:

| **Operating system** | **Input file path**      | **Example (absolute path)**  |
| -------------------- | ------------------------ | ---------------------------- |
| Linux / macOS        | file://\{absolute path}  | file:///home/images/test.png |
| Windows              | file:///\{absolute path} | file:///D:/images/test.png   |
</Accordion>

**Sample code: Multiple image input methods**

<Tabs>
  <Tab title="Python SDK">
    ```python
    import os
    from http import HTTPStatus
    # dashscope sdk >= 1.25.8
    from dashscope import VideoSynthesis
    import dashscope

    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # Get the DashScope API key (API key) from the environment variable
    api_key = os.getenv("DASHSCOPE_API_KEY")

    # ========== Image input method (choose one) ==========
    # [Method 1] Use a public image URL
    first_frame_url = "https://wanx.alicdn.com/material/20250318/first_frame.png"
    last_frame_url = "https://wanx.alicdn.com/material/20250318/last_frame.png"

    # [Method 2] Use a local file path (file:// + file path)
    # Use an absolute path
    # first_frame_url = "file://" + "/path/to/your/first_frame.png"  # Linux/macOS
    # last_frame_url = "file://" + "C:/path/to/your/last_frame.png"  # Windows
    # Or use a relative path
    # first_frame_url = "file://" + "./first_frame.png"              # Use your actual path
    # last_frame_url = "file://" + "./last_frame.png"                # Use your actual path

    def sample_sync_call_kf2v():
      print('please wait...')
      rsp = VideoSynthesis.call(api_key=api_key,
                                    model="wan2.2-kf2v-flash",
                                    prompt="Realistic style, a small black cat looks up at the sky curiously, the camera gradually rises from eye level, and finally captures its curious gaze from a top-down view.",
                                    first_frame_url=first_frame_url,
                                    last_frame_url=last_frame_url,
                                    resolution="720P",
                                    prompt_extend=True)
      print(rsp)
      if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' %
                    (rsp.status_code, rsp.code, rsp.message))

    if __name__ == '__main__':
      sample_sync_call_kf2v()
    ```
  </Tab>

  <Tab title="Java SDK">
    ```java
    // Copyright (c) Alibaba, Inc. and its affiliates.

    // dashscope sdk >= 2.20.1
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
    import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.alibaba.dashscope.utils.JsonUtils;

    import java.util.HashMap;
    import java.util.Map;

    public class Kf2vSyncIntl {

      static {
        Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
      }

      // Get the DashScope API key (API key) from the environment variable
      static String apiKey = System.getenv("DASHSCOPE_API_KEY");

      /**
           * Image input method (choose one):
           *
           * [Method 1] Public URL
           */
      static String firstFrameUrl = "https://wanx.alicdn.com/material/20250318/first_frame.png";
      static String lastFrameUrl = "https://wanx.alicdn.com/material/20250318/last_frame.png";

           /**
           * [Method 2] Local file path (file:// + absolute path or file:/// + absolute path)
           */
      // static String firstFrameUrl = "file://" + "/your/path/to/first_frame.png";  // Linux/macOS
      // static String lastFrameUrl = "file:///" + "C:/path/to/your/img.png";        // Windows

      public static void syncCall() {

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("prompt_extend", true);
        parameters.put("resolution", "720P");

        VideoSynthesis videoSynthesis = new VideoSynthesis();
        VideoSynthesisParam param =
            VideoSynthesisParam.builder()
                .apiKey(apiKey)
                .model("wan2.2-kf2v-flash")
                .prompt("Realistic style, a small black cat looks up at the sky curiously, the camera gradually rises from eye level, and finally captures its curious gaze from a top-down view.")
                .firstFrameUrl(firstFrameUrl)
                .lastFrameUrl(lastFrameUrl)
                .parameters(parameters)
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
</Tabs>

## Output video

- **Number of videos**: One.
- **Specifications**: Specifications vary by model. See [Video generation models](/developer-guides/getting-started/video-models#all-models).
- **URL expiration**: **24 hours**.
- **Dimensions**: Determined by the first-frame image and the `resolution` setting.
  - The model preserves the aspect ratio of the first-frame image and scales the total pixel count close to the target. Because of encoding requirements, the output width and height must be divisible by 16. The model adjusts dimensions automatically.
  - For example: Input image is 750x1000 (aspect ratio 3:4 = 0.75). Set resolution = "720P" (target pixel count approximately 920,000). Output may be 816 x 1104 (aspect ratio approximately 0.739, pixel count approximately 900,000), with both dimensions divisible by 16.

## Billing and rate limits

- For free quota and pricing details, see [Model invocation pricing](/developer-guides/getting-started/pricing).
- For model rate limits, see [Rate limits](/developer-guides/administration/rate-limits).
- Billing details:
  - Input is free. Output is billed. Billing is based on the number of **successful video seconds** generated.
  - Failed or erroneous calls incur no charges and do not consume your [free trial quota](/resources/free-quota).

## API reference

- [wan2.7 image-to-video API reference](/api-reference/video-generation/wan27-image-to-video/create-task) (first-frame, first-last-frame, and video continuation share one endpoint)
- [wan2.2 first and last frames API reference](/api-reference/video-generation/wan-image-to-video-first-last-frames/create-task)

## FAQ

### How do I generate a video with a specific aspect ratio (such as 3:4)?

**wan2.7**: The aspect ratio is determined by the first-frame image. When a `first_frame` is provided in the `media` array, the `ratio` parameter is ignored and the output matches the image's aspect ratio.

**wan2.2 and earlier**: The API does not support specifying aspect ratios directly. You can only set the video resolution using the `resolution` parameter.

The `resolution` parameter controls total pixel count, not strict aspect ratio. The model prioritizes preserving the original aspect ratio of the first-frame image (`first_frame_url`) and makes minor adjustments to meet encoding requirements (width and height must be multiples of 16). To get a video close to 3:4, upload a first-frame image with a 3:4 aspect ratio.

<Note>
  For example: Input image is 750x1000 (aspect ratio 3:4 = 0.75). Set resolution = "720P" (target pixel count approximately 920,000). Output may be 816 x 1104 (aspect ratio approximately 0.739, pixel count approximately 900,000), with both dimensions divisible by 16.
</Note>

### SDK error: "url error, please check url!"

Make sure:

- Your DashScope Python SDK version is at least `1.25.8`.
- Your DashScope Java SDK version is at least `2.22.6`.

If your version is too low, you may see the "url error, please check url!" error. [Upgrade the SDK](/api-reference/preparation/install-sdk).
