'''
Business: Search and get user information for starting private chats
Args: event with httpMethod, queryStringParameters with search query
Returns: HTTP response with users list
'''

import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'GET':
        params = event.get('queryStringParameters', {})
        search_query = params.get('search', '').strip()
        current_user_id = params.get('user_id')
        
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        if search_query:
            cur.execute("""
                SELECT id, username, display_name, avatar_color, avatar_url, bio, is_online, last_seen
                FROM users
                WHERE (username ILIKE %s OR display_name ILIKE %s)
                AND id != %s
                ORDER BY is_online DESC, last_seen DESC
                LIMIT 20
            """, (f'%{search_query}%', f'%{search_query}%', current_user_id or 0))
        else:
            cur.execute("""
                SELECT id, username, display_name, avatar_color, avatar_url, bio, is_online, last_seen
                FROM users
                WHERE id != %s
                ORDER BY is_online DESC, last_seen DESC
                LIMIT 50
            """, (current_user_id or 0,))
        
        users = []
        for row in cur.fetchall():
            users.append({
                'id': row[0],
                'username': row[1],
                'display_name': row[2],
                'avatar_color': row[3],
                'avatar_url': row[4],
                'bio': row[5],
                'is_online': row[6],
                'last_seen': row[7].isoformat() if row[7] else None
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(users),
            'isBase64Encoded': False
        }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
