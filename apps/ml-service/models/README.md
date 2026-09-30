# Place exported weights here

Required for live damage AI:
- `damage.onnx` — from Colab `runs/.../weights/best.onnx` (CarDD YOLO-seg)

Optional later:
- `parts.onnx` — panel/part detector (not in CarDD; train separately)

Copy example:
```
copy best.onnx apps\ml-service\models\damage.onnx
```
