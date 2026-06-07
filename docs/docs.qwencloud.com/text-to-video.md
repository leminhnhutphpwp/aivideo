> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Text-to-video

> Generate video from text

The Wan text-to-video model supports **multimodal input** — including text and audio — and generates videos up to 15 seconds long at 1080P resolution.

- **Core capabilities**: Supports integer video durations (2-15 seconds), custom video resolutions (720P or 1080P), aspect ratio control, prompt rewriting, and watermarking.
- **Audio capabilities**: Supports automatic dubbing or custom audio files for synchronized audio and video. **(Supported by wan2.5 and later)**
- **Multi-shot narrative**: Generates videos with multiple shots while keeping the main subject consistent across shot transitions. **(Supported by wan2.6 and wan2.7)**

**Quick access:** [Try it online](https://home.qwencloud.com/try-ai) **|** API reference: [wan2.7](/api-reference/video-generation/wan27-text-to-video/create-task), [wan2.6](/api-reference/video-generation/wan-text-to-video/create-task) **|** [Prompt guide](/developer-guides/accuracy-tuning/video-generation)

## Getting started

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingRight: "12px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingLeft: "12px"}}>**Output video (multi-shot, audio-enabled)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top", paddingRight: "12px"}}>
      A thrilling detective chase story with cinematic storytelling. Shot 1 \[0-3 s]: Wide shot of a rainy New York street at night, neon lights flickering, a detective in a black trench coat walking briskly. Shot 2 \[3-6 s]: Medium shot of the detective entering an old building, rain soaking his coat, the door closing slowly behind him. Shot 3 \[6-9 s]: Close-up of the detective's focused, determined eyes as distant sirens wail and he frowns slightly in thought. Shot 4 \[9-12 s]: Medium shot of the detective moving carefully down a dim hallway, his flashlight illuminating the path ahead. Shot 5 \[12-15 s]: Close-up of the detective discovering a key clue, his face lighting up with sudden realization.
    </td>

    <td style={{verticalAlign: "top", paddingLeft: "12px"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20260126/desnzy/wan-t2v-demo.mp4" controls />
    </td>
  </tr>
</table>

Before calling the API, [get an API key](/api-reference/preparation/api-key). Then [set your API key as an environment variable](/api-reference/preparation/export-api-key-env). To use the SDK, [install the DashScope SDK](/api-reference/preparation/install-sdk).

<Note>
  Wan 2.7 uses `resolution` + `ratio` instead of `size`, and describes multi-shot directly in the prompt (no `shot_type` parameter).
</Note>

**Step 1: Create a task to get the task ID**

```bash
curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
  -H 'X-DashScope-Async: enable' \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
  "model": "wan2.7-t2v",
  "input": {
    "prompt": "A thrilling detective chase story with cinematic storytelling. Shot 1 [0-3 s]: Wide shot of a rainy New York street at night, neon lights flickering, a detective in a black trench coat walking briskly. Shot 2 [3-6 s]: Medium shot of the detective entering an old building, rain soaking his coat, the door closing slowly behind him. Shot 3 [6-9 s]: Close-up of the detective focused, determined eyes as distant sirens wail and he frowns slightly in thought. Shot 4 [9-12 s]: Medium shot of the detective moving carefully down a dim hallway, his flashlight illuminating the path ahead. Shot 5 [12-15 s]: Close-up of the detective discovering a key clue, his face lighting up with sudden realization."
  },
  "parameters": {
    "resolution": "1080P",
    "ratio": "16:9",
    "prompt_extend": true,
    "duration": 15
  }
}'
```

**Step 2: Get the result using the task ID**

Replace `task_id` with the `task_id` value returned by the previous API call.

```bash
curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
--header "Authorization: Bearer $DASHSCOPE_API_KEY"
```

<Accordion title="wan2.6 examples (Python SDK, Java SDK, curl)">
  To use the SDK, [install the DashScope SDK](/api-reference/preparation/install-sdk).

  <Tabs>
    <Tab title="Python SDK">
      <Warning>
        Make sure your DashScope Python SDK version is **at least** `1.25.8` before running the code below.

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
                                  model='wan2.6-t2v',
                                  prompt='A thrilling detective chase story with cinematic storytelling. Shot 1 [0–3 s]: Wide shot of a rainy New York street at night, neon lights flickering, a detective in a black trench coat walking briskly. Shot 2 [3–6 s]: Medium shot of the detective entering an old building, rain soaking his coat, the door closing slowly behind him. Shot 3 [6–9 s]: Close-up of the detective\'s focused, determined eyes as distant sirens wail and he frowns slightly in thought. Shot 4 [9–12 s]: Medium shot of the detective moving carefully down a dim hallway, his flashlight illuminating the path ahead. Shot 5 [12–15 s]: Close-up of the detective discovering a key clue, his face lighting up with sudden realization.',
                                  size="1280*720",
                                  duration=15,
                                  shot_type="multi",
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
        Make sure your DashScope Java SDK version is **at least** `2.22.6` before running the code below.

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

      public class Text2Video {

        static {
          Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // If you have not set an environment variable, replace the line below with: apiKey="sk-xxx"
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        public static void text2video() throws ApiException, NoApiKeyException, InputRequiredException {
          VideoSynthesis vs = new VideoSynthesis();
          VideoSynthesisParam param =
              VideoSynthesisParam.builder()
                  .apiKey(apiKey)
                  .model("wan2.6-t2v")
                  .prompt("A thrilling detective chase story with cinematic storytelling. Shot 1 [0–3 s]: Wide shot of a rainy New York street at night, neon lights flickering, a detective in a black trench coat walking briskly. Shot 2 [3–6 s]: Medium shot of the detective entering an old building, rain soaking his coat, the door closing slowly behind him. Shot 3 [6–9 s]: Close-up of the detective's focused, determined eyes as distant sirens wail and he frowns slightly in thought. Shot 4 [9–12 s]: Medium shot of the detective moving carefully down a dim hallway, his flashlight illuminating the path ahead. Shot 5 [12–15 s]: Close-up of the detective discovering a key clue, his face lighting up with sudden realization.")
                  .duration(15)
                  .size("1280*720")
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
            text2video();
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
      curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
        -H 'X-DashScope-Async: enable' \
        -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
        -H 'Content-Type: application/json' \
        -d '{
        "model": "wan2.6-t2v",
        "input": {
          "prompt": "A thrilling detective chase story with cinematic storytelling. Shot 1 [0–3 s]: Wide shot of a rainy New York street at night, neon lights flickering, a detective in a black trench coat walking briskly. Shot 2 [3–6 s]: Medium shot of the detective entering an old building, rain soaking his coat, the door closing slowly behind him. Shot 3 [6–9 s]: Close-up of the detective's focused, determined eyes as distant sirens wail and he frowns slightly in thought. Shot 4 [9–12 s]: Medium shot of the detective moving carefully down a dim hallway, his flashlight illuminating the path ahead. Shot 5 [12–15 s]: Close-up of the detective discovering a key clue, his face lighting up with sudden realization."
        },
        "parameters": {
          "size": "1280*720",
          "prompt_extend": true,
          "watermark": true,
          "duration": 15,
          "shot_type":"multi"
        }
      }'
      ```

      **Step 2: Get the result using the task ID**

      Replace `task_id` with the `task_id` value returned by the previous API call.

      ```bash
      curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
      --header "Authorization: Bearer $DASHSCOPE_API_KEY"
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

### Create multi-shot videos

**Supported models**: `wan2.7`, `wan2.6 series`.

**Description**: The model automatically switches between shots — for example, from a wide shot to a close-up — ideal for music videos and similar use cases.

**Parameters**:

- **wan2.7**: Describe shots directly in the prompt text (e.g., `Shot 1 [0-3 s]: ...`). No `shot_type` parameter needed.
- **wan2.6**: Set `shot_type` to `"multi"`.
- `prompt_extend`: Set to `true` (enables prompt rewriting to optimize shot descriptions).

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingRight: "12px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingLeft: "12px"}}>**Output video (multi-shot video)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top", paddingRight: "12px"}}>
      A vision of harmony between future technology and nature. Shot 1 \[0-2 s]: Wide shot of an aerial garden in a futuristic city, floating plants swaying gently in the breeze. Shot 2 \[2-4 s]: A robot gardener carefully trims plants with precise, graceful movements. Shot 3 \[4-7 s]: Sunlight streams through a transparent dome, illuminating the entire garden and showcasing perfect fusion of technology and nature. Shot 4 \[7-10 s]: The camera pulls back to reveal the grand scale of the entire futuristic city, with the aerial garden just one part of it.
    </td>

    <td style={{verticalAlign: "top", paddingLeft: "12px"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20260126/bczhoy/wan-i2v-video-multi.mp4" controls />
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

    # If you have not set an environment variable, replace the line below with: api_key="sk-xxx"
    api_key = os.getenv("DASHSCOPE_API_KEY")

    def sample_async_call_t2v():
      # Asynchronous call returns a task_id
      rsp = VideoSynthesis.async_call(api_key=api_key,
                      model='wan2.6-t2v',
                      prompt='A vision of harmony between future technology and nature. Shot 1 [0–2 s]: Wide shot of an aerial garden in a futuristic city, floating plants swaying gently in the breeze. Shot 2 [2–4 s]: A robot gardener carefully trims plants with precise, graceful movements. Shot 3 [4–7 s]: Sunlight streams through a transparent dome, illuminating the entire garden and showcasing perfect fusion of technology and nature. Shot 4 [7–10 s]: The camera pulls back to reveal the grand scale of the entire futuristic city, with the aerial garden just one part of it.',
                      size='1280*720',
                      shot_type="multi",  # Multi-shot
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

      # Wait for asynchronous task to complete
      rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
      print(rsp)
      if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
      else:
        print('Failed, status_code: %s, code: %s, message: %s' % (rsp.status_code, rsp.code, rsp.message))

    if __name__ == '__main__':
      sample_async_call_t2v()
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

    public class Text2Video {
      static {
        Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
      }

      // If you have not set an environment variable, replace the line below with: apiKey="sk-xxx"
      static String apiKey = System.getenv("DASHSCOPE_API_KEY");

      public static void text2Video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
             VideoSynthesisParam param =
            VideoSynthesisParam.builder()
                .apiKey(apiKey)
                .model("wan2.6-t2v")
                .prompt("A vision of harmony between future technology and nature. Shot 1 [0–2 s]: Wide shot of an aerial garden in a futuristic city, floating plants swaying gently in the breeze. Shot 2 [2–4 s]: A robot gardener carefully trims plants with precise, graceful movements. Shot 3 [4–7 s]: Sunlight streams through a transparent dome, illuminating the entire garden and showcasing perfect fusion of technology and nature. Shot 4 [7–10 s]: The camera pulls back to reveal the grand scale of the entire futuristic city, with the aerial garden just one part of it.")
                .negativePrompt("")
                .size("1280*720")
                .shotType("multi")
                .duration(10)
                .promptExtend(true)
                .watermark(true)
                .seed(12345)
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
          text2video();
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
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.6-t2v",
      "input": {
        "prompt": "A vision of harmony between future technology and nature. Shot 1 [0-2 s]: Wide shot of an aerial garden in a futuristic city, floating plants swaying gently in the breeze. Shot 2 [2-4 s]: A robot gardener carefully trims plants with precise, graceful movements. Shot 3 [4-7 s]: Sunlight streams through a transparent dome, illuminating the entire garden and showcasing perfect fusion of technology and nature. Shot 4 [7-10 s]: The camera pulls back to reveal the grand scale of the entire futuristic city, with the aerial garden just one part of it."
      },
      "parameters": {
        "size": "1280*720",
        "prompt_extend": true,
        "duration": 10,
        "shot_type":"multi"
      }
    }'
    ```

    **Step 2: Get the result using the task ID**

    Replace `task_id` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

### Synchronize audio and video

**Supported models**: `wan2.7`, `wan2.6 series`, `wan2.5 series`.

**Description**: Make characters in photos speak or sing, with mouth movements matching the audio. For more examples, see [Video audio generation](/developer-guides/accuracy-tuning/video-generation).

**Parameters**:

- **Provide an audio file**: Pass an `audio_url`. The model aligns mouth movement to the audio.
- **Automatic dubbing**: Audio-enabled video is generated by default. Do not pass `audio_url`. The model auto-generates background sound effects, music, or voice based on the scene.

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingRight: "12px"}}>**Input example**</th>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingLeft: "12px"}}>**Output video (audio-enabled video)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top", paddingRight: "12px"}}>
      <strong>Input prompt</strong>: Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: <strong>'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '</strong>. <strong>Input audio</strong>: <audio style={{width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250929/ajcbjm/%E7%8B%90%E7%8B%B8.mp3" controls />
    </td>

    <td style={{verticalAlign: "top", paddingLeft: "12px"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20251218/yqyrak/wan2.6-intl+%281%29.mp4" controls />
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

    # If you have not set an environment variable, replace the line below with: api_key="sk-xxx"
    api_key = os.getenv("DASHSCOPE_API_KEY")

    def sample_async_call_t2v():
      # Asynchronous call returns a task_id
      rsp = VideoSynthesis.async_call(api_key=api_key,
                      model='wan2.6-t2v',
                      prompt="Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '.",
                      audio_url='https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3',
                      size='1280*720',
                      duration=10,
                      shot_type="multi",  # Multi-shot
                      prompt_extend=True,
                      watermark=True,
                      negative_prompt="",
                      seed=12345)
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
      sample_async_call_t2v()
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

    public class Text2Video {
      static {
        Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
      }

      // If you have not set an environment variable, replace the line below with: apiKey="sk-xxx"
      static String apiKey = System.getenv("DASHSCOPE_API_KEY");

      public static void text2Video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
             VideoSynthesisParam param =
            VideoSynthesisParam.builder()
                .apiKey(apiKey)
                .model("wan2.6-t2v")
                .prompt("Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '.")
                .audioUrl("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3")
                .negativePrompt("")
                .size("1280*720")
                .shotType("multi")
                .duration(10)
                .promptExtend(true)
                .watermark(true)
                .seed(12345)
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
          text2video();
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
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.6-t2v",
      "input": {
        "prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: \"The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them \". ",
        "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3"
      },
      "parameters": {
        "size": "1280*720",
        "prompt_extend": true,
        "duration": 10,
        "shot_type":"multi"
      }
    }'
    ```

    **Step 2: Get the result using the task ID**

    Replace `task_id` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

### Generate silent videos

**Supported models**: `wan2.2 series`, `wan2.1 series`.

**Description**: Ideal for visual-only use cases like animated posters or silent short videos.

**Parameters**: Silent video is the default output for wan2.2 and earlier versions. No extra configuration is needed.

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingRight: "12px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingLeft: "12px"}}>**Output video (silent video)**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top", paddingRight: "12px"}}>
      Low contrast. A street musician performs in a retro 1970s-style subway station, bathed in dim colors and rough textures. He wears a vintage jacket and plays guitar with intense focus. Commuters rush past. A small crowd gradually gathers to listen. The camera pans slowly right, capturing the interplay of instrument sounds and city noise, with vintage subway signs and peeling walls in the background.
    </td>

    <td style={{verticalAlign: "top", paddingLeft: "12px"}}>
      <video style={{display: "block", width: "100%"}} src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250806/sxjvix/text2video.mp4" controls />
    </td>
  </tr>
</table>

<Tabs>
  <Tab title="Python SDK">
    <Note>
      Ensure that the DashScope SDK for Python version is at least `1.25.8`. For instructions on how to update, see [Installing the SDK](/api-reference/preparation/install-sdk).
    </Note>

    ```python
    import os
    from http import HTTPStatus
    from dashscope import VideoSynthesis
    import dashscope

    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # If you have not set an environment variable, replace the line below with: api_key="sk-xxx"
    api_key = os.getenv("DASHSCOPE_API_KEY")

    def sample_async_call_t2v():
      # Asynchronous call returns a task_id
      rsp = VideoSynthesis.async_call(api_key=api_key,
                      model='wan2.2-t2v-plus',
                      prompt='Low contrast. A street musician performs in a retro 1970s-style subway station, bathed in dim colors and rough textures. He wears a vintage jacket and plays guitar with intense focus. Commuters rush past. A small crowd gradually gathers to listen. The camera pans slowly right, capturing the interplay of instrument sounds and city noise, with vintage subway signs and peeling walls in the background.',
                      prompt_extend=True,
                      size='832*480',
                      negative_prompt="",
                      watermark=True,
                      seed=12345)
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
      sample_async_call_t2v()
    ```
  </Tab>

  <Tab title="Java SDK">
    <Note>
      Ensure that the DashScope Java SDK version is at least `2.22.6`. To update the SDK, see [Install the SDK](/api-reference/preparation/install-sdk).
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

    public class Text2Video {
      static {
        Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
      }

      // If you have not set an environment variable, replace the line below with: apiKey="sk-xxx"
      static String apiKey = System.getenv("DASHSCOPE_API_KEY");

      public static void text2video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
        VideoSynthesisParam param =
            VideoSynthesisParam.builder()
                .apiKey(apiKey)
                .model("wan2.2-t2v-plus")
                .prompt("Low contrast. A street musician performs in a retro 1970s-style subway station, bathed in dim colors and rough textures. He wears a vintage jacket and plays guitar with intense focus. Commuters rush past. A small crowd gradually gathers to listen. The camera pans slowly right, capturing the interplay of instrument sounds and city noise, with vintage subway signs and peeling walls in the background.")
                .size("832*480")
                .promptExtend(true)
                .watermark(true)
                .seed(12345)
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
          text2video();
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
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.2-t2v-plus",
      "input": {
        "prompt": "Low contrast. A street musician performs in a retro 1970s-style subway station, bathed in dim colors and rough textures. He wears a vintage jacket and plays guitar with intense focus. Commuters rush past. A small crowd gradually gathers to listen. The camera pans slowly right, capturing the interplay of instrument sounds and city noise, with vintage subway signs and peeling walls in the background."
      },
      "parameters": {
        "size": "832*480",
        "prompt_extend": true,
        "watermark": true
      }
    }'
    ```

    **Step 2: Get the result using the task ID**

    Replace `task_id` with the `task_id` value returned by the previous API call.

    ```bash
    curl -X GET https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id} \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>
</Tabs>

## Input audio

- **Number of files**: One.
- **Input methods**:
  - **Public URL**: Supports HTTP or HTTPS protocols.

## Output video

- **Number of files**: One.
- **Format**: MP4. See [Video generation models](/developer-guides/getting-started/video-models#all-models) for output specifications per model.
- **URL expiration**: **24 hours**.
- **Dimensions**:
  - **wan2.7**: Set by `resolution` and `ratio`. For example, `resolution=1080P` + `ratio=16:9` outputs a **1920x1080** video.
  - **wan2.6 and earlier**: Set by the `size` parameter. For example, `size=1280*720` outputs a **16:9** video.

## Billing and rate limits

- For free quota and pricing details, see [Model invocation pricing](/developer-guides/getting-started/pricing).
- For model rate limits, see [Rate limits](/developer-guides/administration/rate-limits).
- Billing details:
  - Input is free. Output is billed per successfully generated **second of video**.
  - Failed model calls or processing errors incur no charge and do not consume your [free quota](/resources/free-quota).

## API reference

- [Wan 2.7 text-to-video API reference](/api-reference/video-generation/wan27-text-to-video/create-task)
- [Wan 2.6 text-to-video API reference](/api-reference/video-generation/wan-text-to-video/create-task)

## FAQ

### How do I set the video aspect ratio (for example, 16:9)?

**wan2.7**: Use the `ratio` parameter directly (e.g., `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"`, `"3:4"`), combined with `resolution` (`"720P"` or `"1080P"`).

**wan2.6 and earlier**: Use the `size` parameter to specify the video resolution in pixels. The system calculates the aspect ratio automatically. For example, `size=1280*720` outputs a **16:9** video.

### SDK error: "url error, please check url!"

Make sure:

- Your DashScope Python SDK version is at least `1.25.8`.
- Your DashScope Java SDK version is at least `2.22.6`.

If your version is too low, you may see the "url error, please check url!" error. [Upgrade the SDK](/api-reference/preparation/install-sdk).

### Why does the call fail with "Model not exist"?

Check these items:

- Is the model name spelled correctly?

For a list of supported models, see [Video generation models](/developer-guides/getting-started/video-models).
