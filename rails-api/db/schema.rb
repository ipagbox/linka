# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2024_03_01_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "invites", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "created_by_identifier"
    t.datetime "expires_at"
    t.datetime "last_used_at"
    t.integer "max_uses"
    t.string "note"
    t.string "status", default: "active", null: false
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.string "usage_type", null: false
    t.integer "used_count", default: 0, null: false
    t.index ["expires_at"], name: "index_invites_on_expires_at"
    t.index ["status"], name: "index_invites_on_status"
    t.index ["token_digest"], name: "index_invites_on_token_digest", unique: true
  end
end
