<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'roleName' => ['required', 'string', 'in:student,tutor'],
        ];
    }

    public function messages(): array
    {
        return [
            'roleName.in' => 'Valid role (student or tutor) is required',
        ];
    }
}

