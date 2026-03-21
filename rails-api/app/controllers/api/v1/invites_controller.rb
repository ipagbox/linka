module Api
  module V1
    class InvitesController < ApplicationController
      # POST /api/v1/invites
      def create
        raw_token = Invite.generate_raw_token
        invite = Invite.new(
          token_digest:          Invite.digest_token(raw_token),
          usage_type:            params[:usage_type] || "single_use",
          max_uses:              params[:max_uses],
          expires_at:            params[:expires_at],
          note:                  params[:note],
          created_by_identifier: params[:created_by_identifier]
        )

        unless invite.save
          return render json: { error: invite.errors.full_messages.join(", "), code: "validation_error" },
                        status: :unprocessable_entity
        end

        render json: {
          token:  raw_token,
          invite: invite_json(invite)
        }, status: :created
      end

      # GET /api/v1/invites/:token
      def show
        invite = Invite.find_by_raw_token(params[:token])

        if invite.nil?
          return render json: { usable: false, reason: "invalid" }, status: :ok
        end

        if invite.usable?
          render json: {
            usable:     true,
            status:     invite.status,
            usage_type: invite.usage_type,
            used_count: invite.used_count,
            max_uses:   invite.max_uses,
            expires_at: invite.expires_at
          }
        else
          render json: {
            usable:  false,
            reason:  invite.unusability_reason.to_s,
            status:  invite.status
          }
        end
      end

      # POST /api/v1/invites/:token/consume
      def consume
        invite = Invite.find_by_raw_token(params[:token])

        if invite.nil?
          return render json: { error: "Invite not found or invalid token", code: "not_found" },
                        status: :not_found
        end

        begin
          invite.consume!
          render json: { consumed: true, used_count: invite.used_count }
        rescue InviteNotUsableError => e
          render json: { error: "Invite cannot be consumed: #{e.reason}", code: e.reason.to_s },
                 status: :unprocessable_entity
        end
      end

      private

      def invite_json(invite)
        {
          id:                    invite.id,
          status:                invite.status,
          usage_type:            invite.usage_type,
          max_uses:              invite.max_uses,
          used_count:            invite.used_count,
          expires_at:            invite.expires_at,
          note:                  invite.note,
          created_by_identifier: invite.created_by_identifier,
          created_at:            invite.created_at
        }
      end
    end
  end
end
