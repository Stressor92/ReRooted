from fastapi import APIRouter

router = APIRouter(tags=["export"])


@router.get("/image-formats")
def get_image_export_formats():
    return {
        "default": "png",
        "formats": [
            {"id": "png", "label": "PNG", "mime_type": "image/png", "extension": "png"},
            {"id": "jpg", "label": "JPG", "mime_type": "image/jpeg", "extension": "jpg"},
            {"id": "svg", "label": "SVG", "mime_type": "image/svg+xml", "extension": "svg"},
        ],
    }
