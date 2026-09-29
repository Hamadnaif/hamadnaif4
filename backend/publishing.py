"""Public payloads use the last published revision, never mutable drafts."""
def published_content(site):
    content = site.get('published_snapshot') or site
    return {**{k: content.get(k) for k in ('name', 'brand', 'pages', 'seo')},
            'id': str(site['_id']), 'subdomain': site['subdomain'], 'published_at': site.get('published_at')}
