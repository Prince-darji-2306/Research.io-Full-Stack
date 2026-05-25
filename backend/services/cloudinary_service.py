import os
import asyncio
import logging
from typing import Optional
import cloudinary
import cloudinary.uploader
from core.database import get_pool
from models.paper import update_paper_storage_url
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)
   

def _upload_to_cloudinary_sync(file_path: str, filename: str) -> Optional[str]:
    """Synchronous function to upload to Cloudinary."""
    
        
    try:
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )

        response = cloudinary.uploader.upload(
            file_path, 
            resource_type="auto",
            public_id=filename.replace('.pdf', ''),
            use_filename=True,
            unique_filename=True
        )
        logger.info(f"File uploaded to Cloudinary. URL: {response.get('secure_url')}")
        return response.get('secure_url')
    except Exception as e:
        logger.error(f"Failed to upload to Cloudinary: {e}")
        return None

async def upload_pdf_to_cloudinary(paper_id: str, file_path: str, filename: str):

    logger.info(f"Starting background upload for paper {paper_id} to Cloudinary...")
    storage_url = await asyncio.to_thread(_upload_to_cloudinary_sync, file_path, filename)
    
    if storage_url:
        pool = get_pool()
        async with pool.acquire() as conn:
            await update_paper_storage_url(conn, paper_id, storage_url)
            logger.info(f"Updated storage_url for paper {paper_id} in database.")
    else:
        logger.info(f"Skipping database update for paper {paper_id} as storage_url is None.")
