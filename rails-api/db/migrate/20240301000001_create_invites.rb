class CreateInvites < ActiveRecord::Migration[8.1]
  def change
    create_table :invites do |t|
      t.string  :token_digest,          null: false
      t.string  :status,                null: false, default: "active"
      t.string  :usage_type,            null: false
      t.integer :max_uses
      t.integer :used_count,            null: false, default: 0
      t.datetime :expires_at
      t.datetime :last_used_at
      t.string  :note
      t.string  :created_by_identifier

      t.timestamps
    end

    add_index :invites, :token_digest, unique: true
    add_index :invites, :status
    add_index :invites, :expires_at
  end
end
