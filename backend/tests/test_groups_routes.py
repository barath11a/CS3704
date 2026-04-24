"""Tests for routes/groups.py (Haradeep's PM4 contribution).

Covers:
  - list_groups: JWT-protected, returns groups the user owns or belongs to
  - create_group: derives owner_id from the JWT, requires a name
  - get_group: returns a single group's details
  - add_member: appends a member, validates user_id

AI use: Drafted with Claude using the conftest.py prompt and reviewed
against routes/groups.py.
"""

from models import db
from models.group import Group, GroupMember


def test_list_groups_requires_jwt(client):
    resp = client.get("/api/groups")
    assert resp.status_code == 401


def test_create_group_uses_jwt_identity_as_owner(client, auth_header, app):
    user, headers = auth_header
    resp = client.post("/api/groups", json={"name": "Roommates"}, headers=headers)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["name"] == "Roommates"
    assert body["owner_id"] == user.id
    # Creator should auto-be a member of the group they own.
    assert user.id in body["members"]


def test_create_group_requires_name(client, auth_header):
    _, headers = auth_header
    resp = client.post("/api/groups", json={}, headers=headers)
    assert resp.status_code == 400


def test_list_groups_returns_owned_and_member_groups(client, user_factory, app):
    owner, owner_token, _ = user_factory()
    member, member_token, _ = user_factory()

    with app.app_context():
        g1 = Group(name="Owned", owner_id=owner.id)
        g2 = Group(name="JustMember", owner_id=member.id)
        db.session.add_all([g1, g2])
        db.session.commit()
        # owner is also a member of g2 (added explicitly).
        db.session.add(GroupMember(group_id=g2.id, user_id=owner.id))
        db.session.commit()

    headers = {"Authorization": f"Bearer {owner_token}"}
    resp = client.get("/api/groups", headers=headers)
    assert resp.status_code == 200
    names = sorted([g["name"] for g in resp.get_json()])
    assert names == ["JustMember", "Owned"]


def test_get_group_returns_details(client, auth_header, app):
    user, headers = auth_header
    create = client.post("/api/groups", json={"name": "Trip"}, headers=headers)
    gid = create.get_json()["id"]

    resp = client.get(f"/api/groups/{gid}")
    assert resp.status_code == 200
    assert resp.get_json()["name"] == "Trip"


def test_get_group_404_when_missing(client):
    resp = client.get("/api/groups/9999")
    assert resp.status_code == 404


def test_add_member_appends_and_validates(client, auth_header, user_factory, app):
    _, headers = auth_header
    create = client.post("/api/groups", json={"name": "G"}, headers=headers)
    gid = create.get_json()["id"]
    other, _, _ = user_factory()

    # Missing user_id -> 400
    bad = client.post(f"/api/groups/{gid}/members", json={})
    assert bad.status_code == 400

    ok = client.post(f"/api/groups/{gid}/members", json={"user_id": other.id})
    assert ok.status_code == 201

    with app.app_context():
        members = GroupMember.query.filter_by(group_id=gid).all()
        member_ids = {m.user_id for m in members}
        assert other.id in member_ids
