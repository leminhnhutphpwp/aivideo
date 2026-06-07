> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# General video editing

> Repaint, extend, and edit

**Quick links**: API reference: [wan2.7](/api-reference/video-generation/wan27-video-editing/create-task), [wan2.1](/api-reference/video-generation/wan-general-video-editing/create-task)

## Wan 2.7 video editing

Edit videos at up to 1080P using text prompts and optional reference images -- change styles, replace objects, or transfer content from reference images into the source video. Uses a single unified model with no `function` parameter.

### Parameters (wan2.7)

| **Parameter**              | **Type** | **Required** | **Description**                                                                    |
| -------------------------- | -------- | ------------ | ---------------------------------------------------------------------------------- |
| `model`                    | string   | Yes          | `"wan2.7-videoedit"`                                                               |
| `input.prompt`             | string   | No           | Up to 5,000 characters. Describe the desired edit.                                 |
| `input.negative_prompt`    | string   | No           | Up to 500 characters. Content to exclude.                                          |
| `input.media`              | array    | Yes          | Must include one `video` item. Optionally include up to 4 `reference_image` items. |
| `parameters.resolution`    | string   | No           | `"720P"` or `"1080P"` (default).                                                   |
| `parameters.ratio`         | string   | No           | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"`, `"3:4"`. Defaults to input video ratio.      |
| `parameters.duration`      | integer  | No           | `0` = full input duration (default). `2`-`10` = truncate input video.              |
| `parameters.audio_setting` | string   | No           | `"auto"` (default, model decides) or `"origin"` (keep original audio).             |
| `parameters.prompt_extend` | boolean  | No           | Default: `true`.                                                                   |
| `parameters.watermark`     | boolean  | No           | Default: `false`.                                                                  |

### Example: Change video style

<Tabs>
  <Tab title="curl">
    **Step 1: Create a task**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
      -H 'X-DashScope-Async: enable' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
      "model": "wan2.7-videoedit",
      "input": {
        "prompt": "Convert the entire scene to a claymation style",
        "media": [
          {
            "type": "video",
            "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260402/ldnfdf/wan2.7-videoedit-style-change.mp4"
          }
        ]
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
    curl -X GET 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}' \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY"
    ```
  </Tab>

  <Tab title="Python">
    ```python
    import os
    import time
    import requests

    API_KEY = os.environ.get("DASHSCOPE_API_KEY")
    BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"

    # Step 1: Submit the task
    response = requests.post(
      f"{BASE_URL}/services/aigc/video-generation/video-synthesis",
      headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      json={
        "model": "wan2.7-videoedit",
        "input": {
          "prompt": "Convert the entire scene to a claymation style",
          "media": [
            {
              "type": "video",
              "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260402/ldnfdf/wan2.7-videoedit-style-change.mp4",
            }
          ],
        },
        "parameters": {
          "resolution": "720P",
          "prompt_extend": True,
          "watermark": True,
        },
      },
    )
    task_id = response.json()["output"]["task_id"]
    print(f"Task submitted: {task_id}")

    # Step 2: Poll for the result
    while True:
      status_resp = requests.get(
        f"{BASE_URL}/tasks/{task_id}",
        headers={"Authorization": f"Bearer {API_KEY}"},
      )
      status = status_resp.json()["output"]["task_status"]
      if status == "SUCCEEDED":
        print(f"Video ready: {status_resp.json()['output']['video_url']}")
        break
      elif status == "FAILED":
        print(f"Failed: {status_resp.json()['output'].get('message')}")
        break
      print(f"Status: {status} -- waiting 10s...")
      time.sleep(10)
    ```
  </Tab>
</Tabs>

### Example: Edit with reference image

Replace objects in a video using a reference image:

```bash
curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
  -H 'X-DashScope-Async: enable' \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
  "model": "wan2.7-videoedit",
  "input": {
    "prompt": "Replace the girl'\''s clothes in the video with the clothes from the image",
    "media": [
      {
        "type": "video",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/nlspwm/T2VA_22.mp4"
      },
      {
        "type": "reference_image",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260402/fwjpqf/wan2.7-videoedit-change-clothes.png"
      }
    ]
  },
  "parameters": {
    "resolution": "720P",
    "prompt_extend": true,
    "watermark": true
  }
}'
```

## Wan 2.1 video editing (VACE)

The `wan2.1-vace-plus` model supports 5 specialized editing functions, each selected via the `function` parameter.

## Core capabilities

### Multi-image reference

**Description**: Supports up to **3** reference images, including subjects and backgrounds (people, animals, clothing, scenes). The model merges the images to generate coherent video content.

**Parameter settings:**

- `function`: Must be **`image_reference`**.
- `ref_images_url`: An array of URLs. Supports 1 to 3 reference images.
- `obj_or_bg`: Identifies each image as a subject (obj) or background (bg). The length of this array must be the same as the length of the `ref_images_url` array.

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Input reference image 1 (Reference subject)**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Input reference image 2 (Reference background)**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Output video**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      In the video, a girl walks out from the depths of an ancient, misty forest. Her steps are light, and the camera captures her every graceful moment. When she stops and looks around at the lush trees, a smile of surprise and joy blossoms on her face. This scene, frozen in a moment of intertwined light and shadow, records her wonderful encounter with nature.
    </td>

    <td style={{verticalAlign: "top"}}>
      <img alt="image" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/1007461571/p955656.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
    </td>

    <td style={{verticalAlign: "top"}}>
      <img alt="image" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/1007461571/p955657.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
    </td>

    <td style={{verticalAlign: "top"}}>
      [Output video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250704/agazky/20250506150137950398164_52_29_29.mp4)
    </td>
  </tr>
</table>

Before calling the API, [get an API key](/api-reference/preparation/api-key). Then [set your API key as an environment variable](/api-reference/preparation/api-key).

<Tabs>
  <Tab title="curl">
    **Step 1: Create a task to get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    --header 'X-DashScope-Async: enable' \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "wan2.1-vace-plus",
      "input": {
        "function": "image_reference",
        "prompt": "In the video, a girl gracefully walks out from a misty, ancient forest. Her steps are light, and the camera captures her every nimble moment. When she stops and looks around at the lush woods, a smile of surprise and joy blossoms on her face. This scene, frozen in a moment of interplay between light and shadow, records her wonderful encounter with nature.",
        "ref_images_url": [
          "http://wanx.alicdn.com/material/20250318/image_reference_2_5_16.png",
          "http://wanx.alicdn.com/material/20250318/image_reference_1_5_16.png"
        ]
      },
      "parameters": {
        "prompt_extend": true,
        "obj_or_bg": ["obj","bg"],
        "size": "1280*720"
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

  <Tab title="Python">
    ```python
    import os
    import requests
    import time

    BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"
    API_KEY = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")
    headers = {"X-DashScope-Async": "enable", "Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

    def create_task():
      """Create a video synthesis task and return the task_id"""
      try:
        resp = requests.post(
          f"{BASE_URL}/services/aigc/video-generation/video-synthesis",
          headers={
            "X-DashScope-Async": "enable",
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
          },
          json={
            "model": "wan2.1-vace-plus",
            "input": {
              "function": "image_reference",
              "prompt": "In the video, a girl walks out from the depths of an ancient, misty forest. Her steps are light, and the camera captures her every graceful moment. When she stops and looks around at the lush trees, a smile of surprise and joy blossoms on her face. This scene, frozen in a moment of intertwined light and shadow, records her wonderful encounter with nature.",
              "ref_images_url": [
                "http://wanx.alicdn.com/material/20250318/image_reference_2_5_16.png",
                "http://wanx.alicdn.com/material/20250318/image_reference_1_5_16.png"
              ]
            },
            "parameters": {"prompt_extend": True, "obj_or_bg": ["obj", "bg"], "size": "1280*720"}
          },
          timeout=30
        )
        resp.raise_for_status()
        return resp.json()["output"]["task_id"]
      except requests.RequestException as e:
        raise RuntimeError(f"Failed to create task: {e}")

    def poll_result(task_id):
      while True:
        try:
          resp = requests.get(
            f"{BASE_URL}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10
          )
          resp.raise_for_status()
          data = resp.json()["output"]
          status = data["task_status"]
          print(f"Status: {status}")

          if status == "SUCCEEDED":
            return data["video_url"]
          elif status in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"Task failed: {data.get('message', 'Unknown error')}")
          time.sleep(15)
        except requests.RequestException as e:
          print(f"Polling exception: {e}, retrying in 15 seconds...")
          time.sleep(15)

    if __name__ == "__main__":
      task_id = create_task()
      print(f"Task ID: {task_id}")
      video_url = poll_result(task_id)
      print(f"\nVideo generated successfully: {video_url}")
    ```
  </Tab>

  <Tab title="Java">
    ```java
    import org.json.*;
    import java.io.*;
    import java.net.*;
    import java.util.HashMap;
    import java.util.Map;

    public class VideoSynthesis {
      static final String BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";
      static final String API_KEY = System.getenv("DASHSCOPE_API_KEY");
      private static final Map<String, String> COMMON_HEADERS = new HashMap<>();

      static {
        if (API_KEY == null || API_KEY.isEmpty()) {
          throw new IllegalStateException("DASHSCOPE_API_KEY is not set");
        }
        COMMON_HEADERS.put("Authorization", "Bearer " + API_KEY);
        // Enable HTTP keep-alive (enabled by default in JVM, but explicit setting is more reliable)
        System.setProperty("http.keepAlive", "true");
        System.setProperty("http.maxConnections", "20");
      }

      public static boolean isValidUserUrl(String urlString) {
        try {
          URL url = new URL(urlString);
          // Check if the protocol is secure
          String protocol = url.getProtocol();
          if (!"https".equalsIgnoreCase(protocol) && !"http".equalsIgnoreCase(protocol)) {
            return false;
          }

          return true;
        } catch (Exception e) {
          System.err.println("Invalid URL: " + e.getMessage());
          return false;
        }
      }

      // General HTTP POST request
      private static String httpPost(String path, JSONObject body) throws Exception {
        HttpURLConnection conn = createConnection(path, "POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        try (OutputStream os = conn.getOutputStream()) {
          os.write(body.toString().getBytes("UTF-8"));
        }
        return readResponse(conn);
      }

      // General HTTP GET request
      private static String httpGet(String path) throws Exception {
        HttpURLConnection conn = createConnection(path, "GET");
        return readResponse(conn);
      }

      // Create connection (reuse connection parameters)
      private static HttpURLConnection createConnection(String path, String method) throws Exception {
        URL url = new URL(BASE_URL + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        // Configure connection properties
        conn.setRequestMethod(method);
        conn.setConnectTimeout(30000);  // 30-second connection timeout
        conn.setReadTimeout(60000);     // 60-second read timeout
        conn.setInstanceFollowRedirects(true);  // Allow redirection

        // Set common headers
        for (Map.Entry<String, String> entry : COMMON_HEADERS.entrySet()) {
          conn.setRequestProperty(entry.getKey(), entry.getValue());
        }

        // Header for asynchronous tasks
        if (path.contains("video-synthesis")) {
          conn.setRequestProperty("X-DashScope-Async", "enable");
        }

        // Set content type and accept type
        conn.setRequestProperty("Accept", "application/json");

        return conn;
      }

      // Read response (automatically handle error stream)
      private static String readResponse(HttpURLConnection conn) throws IOException {
        InputStream is = (conn.getResponseCode() >= 200 && conn.getResponseCode() < 400)
            ? conn.getInputStream()
            : conn.getErrorStream();

        if (is == null) {
          throw new IOException("Cannot get response stream, response code: " + conn.getResponseCode());
        }

        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
          StringBuilder sb = new StringBuilder();
          String line;
          while ((line = br.readLine()) != null) {
            sb.append(line);
            sb.append("\n");  // Add a line feed to maintain the original format
          }
          return sb.toString();
        }
      }

      // Step 1: Create a task
      public static String createTask() throws Exception {
        JSONObject body = new JSONObject()
            .put("model", "wan2.1-vace-plus")
            .put("input", new JSONObject()
                .put("function", "image_reference")
                .put("prompt", "In the video, a girl walks out from the depths of an ancient, misty forest. Her steps are light, and the camera captures her every graceful moment. When she stops and looks around at the lush trees, a smile of surprise and joy blossoms on her face. This scene, frozen in a moment of intertwined light and shadow, records her wonderful encounter with nature.")
                .put("ref_images_url", new JSONArray()
                    .put("http://wanx.alicdn.com/material/20250318/image_reference_2_5_16.png")
                    .put("http://wanx.alicdn.com/material/20250318/image_reference_1_5_16.png")))
            .put("parameters", new JSONObject()
                .put("prompt_extend", true)
                .put("obj_or_bg", new JSONArray().put("obj").put("bg"))
                .put("size", "1280*720"));

        String resp = httpPost("/services/aigc/video-generation/video-synthesis", body);
        JSONObject jsonResponse = new JSONObject(resp);

        // Check if the response contains an error message
        if (jsonResponse.has("code") && jsonResponse.getInt("code") != 200) {
          String errorMessage = jsonResponse.optString("message", "Unknown error");
          throw new RuntimeException("Failed to create task: " + errorMessage + ", details: " + resp);
        }
        JSONObject output = jsonResponse.getJSONObject("output");
        return output.getString("task_id");
      }

      // Step 2: Poll for the result (15-second interval, no limit on retries)
      public static String pollResult(String taskId) throws Exception {
        while (true) {
          String resp = httpGet("/tasks/" + taskId);
          JSONObject responseJson = new JSONObject(resp);

          // Validate the response structure
          if (!responseJson.has("output")) {
            throw new RuntimeException("API response is missing the 'output' field: " + resp);
          }

          JSONObject output = responseJson.getJSONObject("output");
          String status = output.getString("task_status");
          System.out.println("Status: " + status);

          if ("SUCCEEDED".equals(status)) {
            return output.getString("video_url");
          } else if ("FAILED".equals(status) || "CANCELLED".equals(status)) {
            String message = output.optString("message", "Unknown error");
            throw new RuntimeException("Task failed: " + message + ", Task ID: " + taskId + ", details: " + resp);
          }
          Thread.sleep(15000);
        }
      }

      public static void main(String[] args) {
        try {
          System.out.println("Creating video synthesis task...");
          String taskId = createTask();
          System.out.println("Task created successfully, Task ID: " + taskId);
          System.out.println("Polling for task result...");
          String videoUrl = pollResult(taskId);
          System.out.println("Video URL: " + videoUrl);
        } catch (Exception e) {
          System.err.println("An error occurred: " + e.getMessage());
          e.printStackTrace(); // Print the full stack trace for debugging
        }
      }

    }
    ```
  </Tab>
</Tabs>

### Video repainting

**Description**: Extracts the subject's pose and motion, composition and motion contours, or sketch structure from an input video. Then combines this with a text prompt to generate a new video with the same dynamic features. You can also replace the subject with a reference image.

**Parameter settings:**

- `function`: Must be **`video_repainting`**.
- `video_url`: **Required**. The URL of the input video. Must be MP4 format, no larger than 50 MB, and no longer than 5 seconds.
- `control_condition`: Optional. Video feature extraction method. This determines which features from the original video are retained:
  - `posebodyface`: Extracts facial expressions and body movements. Retains facial expression details.
  - `posebody`: Extracts only body movements, without the face. Controls only body motion.
  - `depth`: Extracts composition and motion contours. Retains the scene structure.
  - `scribble`: Extracts the sketch structure. Retains sketch edge details.
- `strength`: Optional. Controls feature extraction strength. Range: 0.0--1.0. Default: 1.0. Higher values make the output more similar to the original; lower values allow more creative freedom.
- `ref_images_url`: Optional. URL of a reference image to replace the subject in the input video.

| **Input prompt**                                                                                                                                                                                                       | **Input video**                                                                                                | **Output video**                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| The video shows a black **steampunk-style car** driven by a gentleman, adorned with gears and copper pipes. The background is a steam-powered candy factory with retro elements, creating a vintage and playful scene. | [Input video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250704/lblkoq/depth_2.mp4) | [Output video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250704/sesktr/depth_2_output.mp4) |

<Tabs>
  <Tab title="curl">
    **Step 1: Create a task to get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    --header 'X-DashScope-Async: enable' \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "wan2.1-vace-plus",
      "input": {
        "function": "video_repainting",
        "prompt": "The video shows a black steampunk-style car driven by a gentleman. The car is decorated with gears and copper pipes. The background features a steam-powered candy factory and retro elements, creating a vintage and playful scene.",
        "video_url": "http://wanx.alicdn.com/material/20250318/video_repainting_1.mp4"
      },
      "parameters": {
        "prompt_extend": false,
        "control_condition": "depth"
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

  <Tab title="Python">
    ```python
    import os
    import requests
    import time

    BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"
    API_KEY = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")

    def create_task():
      """Create a video repainting task and return the task_id"""
      try:
        resp = requests.post(
          f"{BASE_URL}/services/aigc/video-generation/video-synthesis",
          headers={
            "X-DashScope-Async": "enable",
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
          },
          json={
            "model": "wan2.1-vace-plus",
            "input": {
              "function": "video_repainting",
              "prompt": "The video shows a black steampunk-style car driven by a gentleman, adorned with gears and copper pipes. The background is a steam-powered candy factory with retro elements, creating a vintage and playful scene.",
              "video_url": "http://wanx.alicdn.com/material/20250318/video_repainting_1.mp4"
            },
            "parameters": {
              "prompt_extend": False, # We recommend disabling prompt rewriting for video repainting.
              "control_condition": "depth" # Optional: posebodyface, posebody, depth, scribble
            }
          },
          timeout=30
        )
        resp.raise_for_status()
        return resp.json()["output"]["task_id"]
      except requests.RequestException as e:
        raise RuntimeError(f"Failed to create task: {e}")

    def poll_result(task_id):
      while True:
        try:
          resp = requests.get(
            f"{BASE_URL}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10
          )
          resp.raise_for_status()
          data = resp.json()["output"]
          status = data["task_status"]
          print(f"Status: {status}")

          if status == "SUCCEEDED":
            return data["video_url"]
          elif status in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"Task failed: {data.get('message', 'Unknown error')}")
          time.sleep(15)
        except requests.RequestException as e:
          print(f"Polling exception: {e}, retrying in 15 seconds...")
          time.sleep(15)

    if __name__ == "__main__":
      task_id = create_task()
      print(f"Task ID: {task_id}")
      video_url = poll_result(task_id)
      print(f"\nVideo generated successfully: {video_url}")
    ```
  </Tab>

  <Tab title="Java">
    ```java
    import org.json.*;
    import java.io.*;
    import java.net.*;
    import java.util.HashMap;
    import java.util.Map;

    public class VideoRepainting {
      static final String BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";
      static final String API_KEY = System.getenv("DASHSCOPE_API_KEY");
      private static final Map<String, String> COMMON_HEADERS = new HashMap<>();

      static {
        if (API_KEY == null || API_KEY.isEmpty()) {
          throw new IllegalStateException("DASHSCOPE_API_KEY is not set");
        }
        COMMON_HEADERS.put("Authorization", "Bearer " + API_KEY);
        System.setProperty("http.keepAlive", "true");
        System.setProperty("http.maxConnections", "20");
      }

      // General HTTP POST request
      private static String httpPost(String path, JSONObject body) throws Exception {
        HttpURLConnection conn = createConnection(path, "POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        try (OutputStream os = conn.getOutputStream()) {
          os.write(body.toString().getBytes("UTF-8"));
        }
        return readResponse(conn);
      }

      // General HTTP GET request
      private static String httpGet(String path) throws Exception {
        HttpURLConnection conn = createConnection(path, "GET");
        return readResponse(conn);
      }

      // Create connection
      private static HttpURLConnection createConnection(String path, String method) throws Exception {
        URL url = new URL(BASE_URL + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        conn.setInstanceFollowRedirects(true);
        for (Map.Entry<String, String> entry : COMMON_HEADERS.entrySet()) {
          conn.setRequestProperty(entry.getKey(), entry.getValue());
        }
        if (path.contains("video-synthesis")) {
          conn.setRequestProperty("X-DashScope-Async", "enable");
        }
        conn.setRequestProperty("Accept", "application/json");
        return conn;
      }

      // Read response
      private static String readResponse(HttpURLConnection conn) throws IOException {
        InputStream is = (conn.getResponseCode() >= 200 && conn.getResponseCode() < 400)
            ? conn.getInputStream()
            : conn.getErrorStream();
        if (is == null) throw new IOException("Cannot get response stream, response code: " + conn.getResponseCode());
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
          StringBuilder sb = new StringBuilder();
          String line;
          while ((line = br.readLine()) != null) {
            sb.append(line).append("\n");
          }
          return sb.toString();
        }
      }

      // Step 1: Create a video repainting task
      public static String createTask() throws Exception {
        JSONObject body = new JSONObject()
            .put("model", "wan2.1-vace-plus")
            .put("input", new JSONObject()
                .put("function", "video_repainting")
                .put("prompt", "The video shows a black steampunk-style car driven by a gentleman, adorned with gears and copper pipes. The background is a steam-powered candy factory with retro elements, creating a vintage and playful scene.")
                .put("video_url", "http://wanx.alicdn.com/material/20250318/video_repainting_1.mp4"))
            .put("parameters", new JSONObject()
                .put("prompt_extend", false)
                .put("control_condition", "depth"));

        String resp = httpPost("/services/aigc/video-generation/video-synthesis", body);
        JSONObject jsonResponse = new JSONObject(resp);

        if (jsonResponse.has("code") && jsonResponse.getInt("code") != 200) {
          String errorMessage = jsonResponse.optString("message", "Unknown error");
          throw new RuntimeException("Failed to create task: " + errorMessage);
        }
        return jsonResponse.getJSONObject("output").getString("task_id");
      }

      // Step 2: Poll for the result
      public static String pollResult(String taskId) throws Exception {
        while (true) {
          String resp = httpGet("/tasks/" + taskId);
          JSONObject output = new JSONObject(resp).getJSONObject("output");
          String status = output.getString("task_status");
          System.out.println("Status: " + status);

          if ("SUCCEEDED".equals(status)) {
            return output.getString("video_url");
          } else if ("FAILED".equals(status) || "CANCELLED".equals(status)) {
            throw new RuntimeException("Task failed: " + output.optString("message", "Unknown error"));
          }
          Thread.sleep(15000);
        }
      }

      public static void main(String[] args) {
        try {
          System.out.println("Creating video repainting task...");
          String taskId = createTask();
          System.out.println("Task created successfully, Task ID: " + taskId);
          System.out.println("Polling for task result...");
          String videoUrl = pollResult(taskId);
          System.out.println("Video URL: " + videoUrl);
        } catch (Exception e) {
          System.err.println("An error occurred: " + e.getMessage());
          e.printStackTrace();
        }
      }
    }
    ```
  </Tab>
</Tabs>

### Local editing

**Description**: Performs fine-grained editing on specified video areas. Supports adding, deleting, and modifying elements, or replacing subjects and backgrounds. Upload a mask image to specify the editing area -- the model automatically tracks the target and blends the generated content.

**Parameter settings:**

- `function`: Must be **`video_edit`**.
- `video_url`: **Required**. The URL of the original input video.
- `mask_image_url`: Optional. Specify either this parameter or `mask_video_url`. We recommend using this parameter. The URL of a mask image. White areas of the mask are edited; black areas remain unchanged.
- `mask_frame_id`: Optional. Use with `mask_image_url` to specify which video frame the mask corresponds to. Default: first frame.
- `mask_type`: Optional. Specifies the behavior of the editing area:
  - `tracking` (default): The editing area automatically follows the target's motion trajectory.
  - `fixed`: The editing area stays in a fixed position.
- `expand_ratio`: Optional. Only effective when `mask_type` is `tracking`.
  - The ratio by which the mask area expands outward. Range: 0.0--1.0. Default: 0.05.
  - Lower values fit the target more closely; higher values expand the mask area.
- `size`: Optional. Output resolution as `width*height` (e.g., `1280*720`).
- `ref_images_url`: Optional. URL of a reference image. Content in the editing area is replaced with the reference image content.

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tr>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Input prompt**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Input video**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Input mask image**</th>
    <th style={{textAlign: "left", width: "25%", paddingBottom: "8px"}}>**Output video**</th>
  </tr>

  <tr>
    <td style={{verticalAlign: "top"}}>
      The video shows a Parisian-style French cafe where a <strong>lion in a suit</strong> is elegantly sipping coffee. It holds a coffee cup in one hand, taking a gentle sip with a relaxed expression. The cafe is tastefully decorated, with soft tones and warm lighting illuminating the area where the lion is.
    </td>

    <td style={{verticalAlign: "top"}}>
      [Input video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250703/cckalc/Inpainting_src_2_new.mp4)
    </td>

    <td style={{verticalAlign: "top"}}>
      <img alt="mask" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/3160651571/p955179.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} /> The white area indicates the editing area.
    </td>

    <td style={{verticalAlign: "top"}}>
      [Output video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250703/egunuc/Inpainting_res_2_new.mp4)
    </td>
  </tr>
</table>

<Tabs>
  <Tab title="curl">
    **Step 1: Create a task to get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    --header 'X-DashScope-Async: enable' \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "wan2.1-vace-plus",
      "input": {
        "function": "video_edit",
        "prompt": "The video shows a Parisian-style French cafe where a lion in a suit is elegantly sipping coffee. It holds a coffee cup in one hand, taking a gentle sip with a relaxed expression. The cafe is tastefully decorated, with soft hues and warm lighting illuminating the area where the lion is.",
        "mask_image_url": "http://wanx.alicdn.com/material/20250318/video_edit_1_mask.png",
        "video_url": "http://wanx.alicdn.com/material/20250318/video_edit_2.mp4",
        "mask_frame_id": 1
      },
      "parameters": {
        "prompt_extend": false,
        "mask_type": "tracking",
        "expand_ratio": 0.05,
        "size": "1280*720"
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

  <Tab title="Python">
    ```python
    import os
    import requests
    import time

    BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"
    API_KEY = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")

    def create_task():
      """Create a local editing task and return the task_id"""
      try:
        resp = requests.post(
          f"{BASE_URL}/services/aigc/video-generation/video-synthesis",
          headers={
            "X-DashScope-Async": "enable",
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
          },
          json={
            "model": "wan2.1-vace-plus",
            "input": {
              "function": "video_edit",
              "prompt": "The video shows a Parisian-style French cafe where a lion in a suit is elegantly sipping coffee. It holds a coffee cup in one hand, taking a gentle sip with a relaxed expression. The cafe is tastefully decorated, with soft tones and warm lighting illuminating the area where the lion is.",
              "mask_image_url": "http://wanx.alicdn.com/material/20250318/video_edit_1_mask.png",
              "video_url": "http://wanx.alicdn.com/material/20250318/video_edit_2.mp4",
              "mask_frame_id": 1 # Frame index to which the mask corresponds
            },
            "parameters": {
              "prompt_extend": False,
              "mask_type": "tracking", # Tracking mode
              "expand_ratio": 0.05,
              "size": "1280*720"
            }
          },
          timeout=30
        )
        resp.raise_for_status()
        return resp.json()["output"]["task_id"]
      except requests.RequestException as e:
        raise RuntimeError(f"Failed to create task: {e}")

    def poll_result(task_id):
      while True:
        try:
          resp = requests.get(
            f"{BASE_URL}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10
          )
          resp.raise_for_status()
          data = resp.json()["output"]
          status = data["task_status"]
          print(f"Status: {status}")

          if status == "SUCCEEDED":
            return data["video_url"]
          elif status in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"Task failed: {data.get('message', 'Unknown error')}")
          time.sleep(15)
        except requests.RequestException as e:
          print(f"Polling exception: {e}, retrying in 15 seconds...")
          time.sleep(15)

    if __name__ == "__main__":
      task_id = create_task()
      print(f"Task ID: {task_id}")
      video_url = poll_result(task_id)
      print(f"\nVideo generated successfully: {video_url}")
    ```
  </Tab>

  <Tab title="Java">
    ```java
    import org.json.*;
    import java.io.*;
    import java.net.*;
    import java.util.HashMap;
    import java.util.Map;

    public class VideoRegionalEdit {
      static final String BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";
      static final String API_KEY = System.getenv("DASHSCOPE_API_KEY");
      private static final Map<String, String> COMMON_HEADERS = new HashMap<>();

      static {
        if (API_KEY == null || API_KEY.isEmpty()) {
          throw new IllegalStateException("DASHSCOPE_API_KEY is not set");
        }
        COMMON_HEADERS.put("Authorization", "Bearer " + API_KEY);
        System.setProperty("http.keepAlive", "true");
      }

      private static String httpPost(String path, JSONObject body) throws Exception {
        HttpURLConnection conn = createConnection(path, "POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        try (OutputStream os = conn.getOutputStream()) {
          os.write(body.toString().getBytes("UTF-8"));
        }
        return readResponse(conn);
      }

      private static String httpGet(String path) throws Exception {
        HttpURLConnection conn = createConnection(path, "GET");
        return readResponse(conn);
      }

      private static HttpURLConnection createConnection(String path, String method) throws Exception {
        URL url = new URL(BASE_URL + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        for (Map.Entry<String, String> entry : COMMON_HEADERS.entrySet()) {
          conn.setRequestProperty(entry.getKey(), entry.getValue());
        }
        if (path.contains("video-synthesis")) {
          conn.setRequestProperty("X-DashScope-Async", "enable");
        }
        return conn;
      }

      private static String readResponse(HttpURLConnection conn) throws IOException {
        InputStream is = (conn.getResponseCode() >= 200 && conn.getResponseCode() < 400) ? conn.getInputStream() : conn.getErrorStream();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
          StringBuilder sb = new StringBuilder();
          String line;
          while ((line = br.readLine()) != null) sb.append(line).append("\n");
          return sb.toString();
        }
      }

      // Step 1: Create a local editing task
      public static String createTask() throws Exception {
        JSONObject body = new JSONObject()
            .put("model", "wan2.1-vace-plus")
            .put("input", new JSONObject()
                .put("function", "video_edit")
                .put("prompt", "The video shows a Parisian-style French cafe where a lion in a suit is elegantly sipping coffee. It holds a coffee cup in one hand, taking a gentle sip with a relaxed expression. The cafe is tastefully decorated, with soft tones and warm lighting illuminating the area where the lion is.")
                .put("mask_image_url", "http://wanx.alicdn.com/material/20250318/video_edit_1_mask.png")
                .put("video_url", "http://wanx.alicdn.com/material/20250318/video_edit_2.mp4")
                .put("mask_frame_id", 1))
            .put("parameters", new JSONObject()
                .put("prompt_extend", false)
                .put("mask_type", "tracking")
                .put("expand_ratio", 0.05)
                .put("size", "1280*720"));

        String resp = httpPost("/services/aigc/video-generation/video-synthesis", body);
        JSONObject jsonResponse = new JSONObject(resp);

        if (jsonResponse.has("code") && jsonResponse.getInt("code") != 200) {
          String errorMessage = jsonResponse.optString("message", "Unknown error");
          throw new RuntimeException("Failed to create task: " + errorMessage);
        }
        return jsonResponse.getJSONObject("output").getString("task_id");
      }

      // Step 2: Poll for the result
      public static String pollResult(String taskId) throws Exception {
        while (true) {
          String resp = httpGet("/tasks/" + taskId);
          JSONObject output = new JSONObject(resp).getJSONObject("output");
          String status = output.getString("task_status");
          System.out.println("Status: " + status);

          if ("SUCCEEDED".equals(status)) return output.getString("video_url");
          else if ("FAILED".equals(status) || "CANCELLED".equals(status))
            throw new RuntimeException("Task failed: " + output.optString("message"));
          Thread.sleep(15000);
        }
      }

      public static void main(String[] args) {
        try {
          System.out.println("Creating local editing task...");
          String taskId = createTask();
          System.out.println("Task created successfully, Task ID: " + taskId);
          String videoUrl = pollResult(taskId);
          System.out.println("Video URL: " + videoUrl);
        } catch (Exception e) {
          e.printStackTrace();
        }
      }
    }
    ```
  </Tab>
</Tabs>

### Video extension

**Description**: Predicts and generates continuous content based on an input image or video clip. Supports extending a video forward from the first frame or clip, or backward from the last frame or clip. The generated video is 5 seconds long.

**Parameter settings:**

- `function`: Must be **`video_extension`**.
- `prompt`: **Required**. A description of the desired extended content.
- `first_clip_url`: Optional. The URL of the first video clip (3 seconds or shorter). The model generates the rest of the video based on this clip.
- `last_clip_url`: Optional. The URL of the last video clip (3 seconds or shorter). The model generates the preceding content based on this clip.
- `first_frame_url`: Optional. The URL of the first frame image. The video extends forward from this frame.
- `last_frame_url`: Optional. The URL of the last frame image. Generation proceeds backward from this frame.

<Note>
  Specify at least one of the following: `first_clip_url`, `last_clip_url`, `first_frame_url`, or `last_frame_url`.
</Note>

| **Input prompt**                                                         | **Input first clip video (1 second)**                                                                                    | **Output video (Extended video is 5 seconds)**                                                                                     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| A **dog wearing sunglasses is skateboarding** on the street, 3D cartoon. | [Input video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250619/guknnt/video_extension_1.mp4) | [Output video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250704/rzrbyy/cur_gallery_20250515140027.mp4) |

<Tabs>
  <Tab title="curl">
    **Step 1: Create a task to get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    --header 'X-DashScope-Async: enable' \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "wan2.1-vace-plus",
      "input": {
        "function": "video_extension",
        "prompt": "A dog wearing sunglasses is skateboarding on the street, 3D cartoon.",
        "first_clip_url": "http://wanx.alicdn.com/material/20250318/video_extension_1.mp4"
      },
      "parameters": {
        "prompt_extend": false
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

  <Tab title="Python">
    ```python
    import os
    import requests
    import time

    BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"
    API_KEY = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")

    def create_task():
      """Create a video extension task and return the task_id"""
      try:
        resp = requests.post(
          f"{BASE_URL}/services/aigc/video-generation/video-synthesis",
          headers={
            "X-DashScope-Async": "enable",
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
          },
          json={
            "model": "wan2.1-vace-plus",
            "input": {
              "function": "video_extension",
              "prompt": "A dog wearing sunglasses is skateboarding on the street, 3D cartoon.",
              "first_clip_url": "http://wanx.alicdn.com/material/20250318/video_extension_1.mp4"
            },
            "parameters": {
              "prompt_extend": False
            }
          },
          timeout=30
        )
        resp.raise_for_status()
        return resp.json()["output"]["task_id"]
      except requests.RequestException as e:
        raise RuntimeError(f"Failed to create task: {e}")

    def poll_result(task_id):
      while True:
        try:
          resp = requests.get(
            f"{BASE_URL}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10
          )
          resp.raise_for_status()
          data = resp.json()["output"]
          status = data["task_status"]
          print(f"Status: {status}")

          if status == "SUCCEEDED":
            return data["video_url"]
          elif status in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"Task failed: {data.get('message', 'Unknown error')}")
          time.sleep(15)
        except requests.RequestException as e:
          print(f"Polling exception: {e}, retrying in 15 seconds...")
          time.sleep(15)

    if __name__ == "__main__":
      task_id = create_task()
      print(f"Task ID: {task_id}")
      video_url = poll_result(task_id)
      print(f"\nVideo generated successfully: {video_url}")
    ```
  </Tab>

  <Tab title="Java">
    ```java
    import org.json.*;
    import java.io.*;
    import java.net.*;
    import java.util.HashMap;
    import java.util.Map;

    public class VideoExtension {
      static final String BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";
      static final String API_KEY = System.getenv("DASHSCOPE_API_KEY");
      private static final Map<String, String> COMMON_HEADERS = new HashMap<>();

      static {
        if (API_KEY == null || API_KEY.isEmpty()) {
          throw new IllegalStateException("DASHSCOPE_API_KEY is not set");
        }
        COMMON_HEADERS.put("Authorization", "Bearer " + API_KEY);
        System.setProperty("http.keepAlive", "true");
      }

      private static String httpPost(String path, JSONObject body) throws Exception {
        HttpURLConnection conn = createConnection(path, "POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        try (OutputStream os = conn.getOutputStream()) {
          os.write(body.toString().getBytes("UTF-8"));
        }
        return readResponse(conn);
      }

      private static String httpGet(String path) throws Exception {
        HttpURLConnection conn = createConnection(path, "GET");
        return readResponse(conn);
      }

      private static HttpURLConnection createConnection(String path, String method) throws Exception {
        URL url = new URL(BASE_URL + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        for (Map.Entry<String, String> entry : COMMON_HEADERS.entrySet()) {
          conn.setRequestProperty(entry.getKey(), entry.getValue());
        }
        if (path.contains("video-synthesis")) {
          conn.setRequestProperty("X-DashScope-Async", "enable");
        }
        return conn;
      }

      private static String readResponse(HttpURLConnection conn) throws IOException {
        InputStream is = (conn.getResponseCode() >= 200 && conn.getResponseCode() < 400) ? conn.getInputStream() : conn.getErrorStream();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
          StringBuilder sb = new StringBuilder();
          String line;
          while ((line = br.readLine()) != null) sb.append(line).append("\n");
          return sb.toString();
        }
      }

      // Step 1: Create a video extension task
      public static String createTask() throws Exception {
        JSONObject body = new JSONObject()
            .put("model", "wan2.1-vace-plus")
            .put("input", new JSONObject()
                .put("function", "video_extension")
                .put("prompt", "A dog wearing sunglasses is skateboarding on the street, 3D cartoon.")
                .put("first_clip_url", "http://wanx.alicdn.com/material/20250318/video_extension_1.mp4"))
            .put("parameters", new JSONObject()
                .put("prompt_extend", false));

        String resp = httpPost("/services/aigc/video-generation/video-synthesis", body);
        JSONObject jsonResponse = new JSONObject(resp);

        if (jsonResponse.has("code") && jsonResponse.getInt("code") != 200) {
          String errorMessage = jsonResponse.optString("message", "Unknown error");
          throw new RuntimeException("Failed to create task: " + errorMessage);
        }
        return jsonResponse.getJSONObject("output").getString("task_id");
      }

      // Step 2: Poll for the result
      public static String pollResult(String taskId) throws Exception {
        while (true) {
          String resp = httpGet("/tasks/" + taskId);
          JSONObject output = new JSONObject(resp).getJSONObject("output");
          String status = output.getString("task_status");
          System.out.println("Status: " + status);

          if ("SUCCEEDED".equals(status)) return output.getString("video_url");
          else if ("FAILED".equals(status) || "CANCELLED".equals(status))
            throw new RuntimeException("Task failed: " + output.optString("message"));
          Thread.sleep(15000);
        }
      }

      public static void main(String[] args) {
        try {
          System.out.println("Creating video extension task...");
          String taskId = createTask();
          System.out.println("Task created successfully, Task ID: " + taskId);
          String videoUrl = pollResult(taskId);
          System.out.println("Video URL: " + videoUrl);
        } catch (Exception e) {
          e.printStackTrace();
        }
      }
    }
    ```
  </Tab>
</Tabs>

### Frame expansion

**Description**: Expands video frame content proportionally in all directions (top, bottom, left, right) based on a prompt. Maintains video subject continuity and ensures a natural blend with the background.

**Parameter settings:**

- `function`: Must be **`video_outpainting`**.
- `video_url`: **Required**. The URL of the original input video.
- `top_scale`: Optional. Upward expansion ratio. Range: 1.0--2.0. Default: 1.0 (no expansion).
- `bottom_scale`: Optional. Downward expansion ratio. Range: 1.0--2.0. Default: 1.0.
- `left_scale`: Optional. Leftward expansion ratio. Range: 1.0--2.0. Default: 1.0.
- `right_scale`: Optional. Rightward expansion ratio. Range: 1.0--2.0. Default: 1.0.

<Tip>
  **Example**: Setting `left_scale` to 1.5 expands the left side of the frame to 1.5 times its original width.
</Tip>

| **Input prompt**                                                                                   | **Input video**                                                                                                        | **Output video**                                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| An elegant lady is passionately playing the violin, with **a full symphony orchestra behind her**. | [Input video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250704/ewansh/cur_gallery_038.mp4) | [Output video](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/en-US/20250704/wabras/1d3e788a-1a5d-47d9-9c85-b33793f15cdc.mp4) |

<Tabs>
  <Tab title="curl">
    **Step 1: Create a task to get the task ID**

    ```bash
    curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \
    --header 'X-DashScope-Async: enable' \
    --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
    --header 'Content-Type: application/json' \
    --data '{
      "model": "wan2.1-vace-plus",
      "input": {
        "function": "video_outpainting",
        "prompt": "An elegant lady is passionately playing the violin, with a full symphony orchestra behind her.",
        "video_url": "http://wanx.alicdn.com/material/20250318/video_outpainting_1.mp4"
      },
      "parameters": {
        "prompt_extend": false,
        "top_scale": 1.5,
        "bottom_scale": 1.5,
        "left_scale": 1.5,
        "right_scale": 1.5
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

  <Tab title="Python">
    ```python
    import os
    import requests
    import time

    BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"
    API_KEY = os.getenv("DASHSCOPE_API_KEY", "YOUR_API_KEY")

    def create_task():
      """Create a video frame expansion task and return the task_id"""
      try:
        resp = requests.post(
          f"{BASE_URL}/services/aigc/video-generation/video-synthesis",
          headers={
            "X-DashScope-Async": "enable",
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
          },
          json={
            "model": "wan2.1-vace-plus",
            "input": {
              "function": "video_outpainting",
              "prompt": "An elegant lady is passionately playing the violin, with a full symphony orchestra behind her.",
              "video_url": "http://wanx.alicdn.com/material/20250318/video_outpainting_1.mp4"
            },
            "parameters": {
              "prompt_extend": False,
              "top_scale": 1.5,    # Upward expansion ratio
              "bottom_scale": 1.5, # Downward expansion ratio
              "left_scale": 1.5,   # Leftward expansion ratio
              "right_scale": 1.5   # Rightward expansion ratio
            }
          },
          timeout=30
        )
        resp.raise_for_status()
        return resp.json()["output"]["task_id"]
      except requests.RequestException as e:
        raise RuntimeError(f"Failed to create task: {e}")

    def poll_result(task_id):
      while True:
        try:
          resp = requests.get(
            f"{BASE_URL}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10
          )
          resp.raise_for_status()
          data = resp.json()["output"]
          status = data["task_status"]
          print(f"Status: {status}")

          if status == "SUCCEEDED":
            return data["video_url"]
          elif status in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"Task failed: {data.get('message', 'Unknown error')}")
          time.sleep(15)
        except requests.RequestException as e:
          print(f"Polling exception: {e}, retrying in 15 seconds...")
          time.sleep(15)

    if __name__ == "__main__":
      task_id = create_task()
      print(f"Task ID: {task_id}")
      video_url = poll_result(task_id)
      print(f"\nVideo generated successfully: {video_url}")
    ```
  </Tab>

  <Tab title="Java">
    ```java
    import org.json.*;
    import java.io.*;
    import java.net.*;
    import java.util.HashMap;
    import java.util.Map;

    public class VideoOutpainting {
      static final String BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";
      static final String API_KEY = System.getenv("DASHSCOPE_API_KEY");
      private static final Map<String, String> COMMON_HEADERS = new HashMap<>();

      static {
        if (API_KEY == null || API_KEY.isEmpty()) {
          throw new IllegalStateException("DASHSCOPE_API_KEY is not set");
        }
        COMMON_HEADERS.put("Authorization", "Bearer " + API_KEY);
        System.setProperty("http.keepAlive", "true");
      }

      private static String httpPost(String path, JSONObject body) throws Exception {
        HttpURLConnection conn = createConnection(path, "POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        try (OutputStream os = conn.getOutputStream()) {
          os.write(body.toString().getBytes("UTF-8"));
        }
        return readResponse(conn);
      }

      private static String httpGet(String path) throws Exception {
        HttpURLConnection conn = createConnection(path, "GET");
        return readResponse(conn);
      }

      private static HttpURLConnection createConnection(String path, String method) throws Exception {
        URL url = new URL(BASE_URL + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        for (Map.Entry<String, String> entry : COMMON_HEADERS.entrySet()) {
          conn.setRequestProperty(entry.getKey(), entry.getValue());
        }
        if (path.contains("video-synthesis")) {
          conn.setRequestProperty("X-DashScope-Async", "enable");
        }
        return conn;
      }

      private static String readResponse(HttpURLConnection conn) throws IOException {
        InputStream is = (conn.getResponseCode() >= 200 && conn.getResponseCode() < 400) ? conn.getInputStream() : conn.getErrorStream();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
          StringBuilder sb = new StringBuilder();
          String line;
          while ((line = br.readLine()) != null) sb.append(line).append("\n");
          return sb.toString();
        }
      }

      // Step 1: Create a video frame expansion task
      public static String createTask() throws Exception {
        JSONObject body = new JSONObject()
            .put("model", "wan2.1-vace-plus")
            .put("input", new JSONObject()
                .put("function", "video_outpainting")
                .put("prompt", "An elegant lady is passionately playing the violin, with a full symphony orchestra behind her.")
                .put("video_url", "http://wanx.alicdn.com/material/20250318/video_outpainting_1.mp4"))
            .put("parameters", new JSONObject()
                .put("prompt_extend", false)
                .put("top_scale", 1.5)
                .put("bottom_scale", 1.5)
                .put("left_scale", 1.5)
                .put("right_scale", 1.5));

        String resp = httpPost("/services/aigc/video-generation/video-synthesis", body);
        JSONObject jsonResponse = new JSONObject(resp);

        if (jsonResponse.has("code") && jsonResponse.getInt("code") != 200) {
          String errorMessage = jsonResponse.optString("message", "Unknown error");
          throw new RuntimeException("Failed to create task: " + errorMessage);
        }
        return jsonResponse.getJSONObject("output").getString("task_id");
      }

      // Step 2: Poll for the result
      public static String pollResult(String taskId) throws Exception {
        while (true) {
          String resp = httpGet("/tasks/" + taskId);
          JSONObject output = new JSONObject(resp).getJSONObject("output");
          String status = output.getString("task_status");
          System.out.println("Status: " + status);

          if ("SUCCEEDED".equals(status)) return output.getString("video_url");
          else if ("FAILED".equals(status) || "CANCELLED".equals(status))
            throw new RuntimeException("Task failed: " + output.optString("message"));
          Thread.sleep(15000);
        }
      }

      public static void main(String[] args) {
        try {
          System.out.println("Creating video frame expansion task...");
          String taskId = createTask();
          System.out.println("Task created successfully, Task ID: " + taskId);
          String videoUrl = pollResult(taskId);
          System.out.println("Video URL: " + videoUrl);
        } catch (Exception e) {
          e.printStackTrace();
        }
      }
    }
    ```
  </Tab>
</Tabs>

## Input images and videos

### Input images

- **Number of images**: See the number required for your selected feature above.
- **Input method**:
  - **Public URL**: Supports HTTP and HTTPS protocols. Example: `https://xxxx/xxx.png`.

### Input videos

- **Number of videos**: See the number required for your selected feature above.
- **Input method**:
  - **Public URL**: Supports HTTP and HTTPS protocols. Example: `https://xxxx/xxx.mp4`.

## Output video

- **Number of videos**: One.
- **Format**: MP4. See video specifications below for resolution and dimensions.
- **URL expiration**: **24 hours**.
- **Dimensions**: Varies based on the selected feature.
  - **Multi-image reference / Local editing**:
    - Output resolution is fixed at 720P.
    - Specific width and height are determined by the `size` parameter.
  - **Video repainting / Video extension / Frame expansion**:
    - If the input video resolution is 720P or lower, the output resolution matches the input.
    - If the input video resolution is higher than 720P, the output is scaled down to 720P while maintaining aspect ratio.

## Billing and rate limits

- For free quota and pricing, see [Model invocation pricing](/developer-guides/getting-started/pricing).
- For rate limits, see [Rate limits](/developer-guides/administration/rate-limits).
- Billing details:
  - Input is free. Output is billed per successfully generated **second of video**.
  - Failed model calls or processing errors incur no charge and do not consume your [free quota](/resources/free-quota).

## API reference

- [wan2.7 video editing API reference](/api-reference/video-generation/wan27-video-editing/create-task)
- [wan2.1 general video editing API reference](/api-reference/video-generation/wan-general-video-editing/create-task)

## FAQ

### Max images for multi-image reference?

Supports a maximum of 3 reference images. If you provide more than 3, only the first 3 are used. For best results, use a solid background for the subject image to highlight the subject better, and ensure the background image does not contain subject objects.

### When should I disable prompt rewriting for video repainting?

If the text description is inconsistent with the input video content, the model may misinterpret your request. In this case, we recommend manually disabling prompt rewriting by setting `prompt_extend=false` and providing a clear, specific scene description in the prompt. This improves consistency and accuracy.

### Mask image vs mask video in local editing

Specify either a mask image using `mask_image_url` or a mask video using `mask_video_url`. **We recommend using a mask image** because you only need to specify the editing area in a single frame, and the system automatically tracks the target.
