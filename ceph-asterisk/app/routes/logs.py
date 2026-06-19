import logging
import os
from typing import Optional

from elasticsearch import AsyncElasticsearch, NotFoundError
from elasticsearch.exceptions import ConnectionError as ESConnectionError
from elasticsearch.exceptions import TransportError
from fastapi import APIRouter, HTTPException

from app.schemas.logs import LogsModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/logs")

_es_url = os.environ.get("ELASTICSEARCH_URL", "http://elasticsearch:9200")
es = AsyncElasticsearch(_es_url)


@router.get("/", response_model=LogsModel)
async def get_logs(
    page: int = 0,
    limit: int = 5,
    level: Optional[str] = None,
    pbx_id: Optional[str] = None,
    text: Optional[str] = None,
):
    offset = page * limit

    query = {"bool": {"must": [], "filter": []}}

    if text:
        query["bool"]["must"].append({"match_phrase": {"asterisk.message": text}})

    if level:
        if level == "UNKNOWN":
            query["bool"]["filter"].append(
                {
                    "bool": {
                        "should": [
                            {
                                "bool": {
                                    "must_not": {"exists": {"field": "asterisk.level"}}
                                }
                            },
                            {"term": {"asterisk.level.keyword": "UNKNOWN"}},
                        ],
                        "minimum_should_match": 1,
                    }
                }
            )
        else:
            query["bool"]["filter"].append(
                {"term": {"asterisk.level.keyword": level}}
            )

    if pbx_id:
        query["bool"]["filter"].append({"term": {"pbx_id.keyword": pbx_id}})

    if not query["bool"]["must"] and not query["bool"]["filter"]:
        query = {"match_all": {}}

    try:
        response = await es.search(
            index="raw-asterisk-logs",
            body={
                "from": offset,
                "size": limit,
                "query": query,
                "sort": [{"@timestamp": {"order": "desc"}}],
            },
        )
    except NotFoundError:
        return {"status": "success", "data": [], "total": 0, "relation": "eq"}
    except (ESConnectionError, TransportError, ConnectionError, OSError) as e:
        logger.warning("Elasticsearch unavailable: %s", e)
        raise HTTPException(
            status_code=503,
            detail="Elasticsearch недоступен. Логи временно недоступны.",
        ) from e

    logs = []
    for hit in response["hits"]["hits"]:
        source = hit["_source"]

        logs.append(
            {
                "message": {
                    "timestamp": source.get("asterisk", {}).get("timestamp")
                    or source.get("@timestamp"),
                    "level": source.get("asterisk", {}).get("level", "UNKNOWN"),
                    "pid": source.get("asterisk", {}).get("pid"),
                    "file": source.get("asterisk", {}).get("file"),
                    "message": source.get("asterisk", {}).get(
                        "message", source.get("message", "")
                    ),
                },
                "pbx_id": source.get("pbx_id"),
            }
        )

    total = response["hits"]["total"]
    return {
        "status": "success",
        "data": logs,
        "total": total["value"],
        "relation": total["relation"],
    }
